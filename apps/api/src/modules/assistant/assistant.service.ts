import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { buildSystemPrompt } from './knowledge';
import { ChatTurn, LlmProvider } from './llm-provider';

export interface AssistantContext {
  page?: string;
  pageTitle?: string;
}

export interface AssistantAction {
  label: string;
  type: 'navigate';
  target: string;
}

/** Longest single message accepted, in characters. */
const MAX_MESSAGE_CHARS = 2000;
/** How many earlier turns to replay. Enough for follow-ups, bounded for cost. */
const MAX_HISTORY_TURNS = 10;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly llm: LlmProvider,
    private readonly usersRepo: UsersRepository,
  ) {}

  /**
   * Suggested next steps for a reply.
   *
   * Derived from the page and the question rather than asked of the model:
   * a model choosing its own links invents routes that do not exist, and a
   * dead button in a support widget is worse than no button.
   */
  buildActions(message: string, context: AssistantContext): AssistantAction[] {
    const q = message.toLowerCase();
    const actions: AssistantAction[] = [];
    const on = (path: string) => context.page?.startsWith(path);

    if (/(upgrade|plan|pricing|subscri|cost|price|coupon|discount)/.test(q) && !on('/pricing')) {
      actions.push({ label: 'View plans', type: 'navigate', target: '/pricing' });
    }
    if (/(clip|upload|video|short|create|make)/.test(q) && !on('/dashboard')) {
      actions.push({ label: 'Go to dashboard', type: 'navigate', target: '/dashboard' });
    }
    if (/(credit|balance|how many)/.test(q)) {
      actions.push({ label: 'Check credits', type: 'navigate', target: '/dashboard' });
    }
    if (/(invoice|billing|receipt|cancel|refund)/.test(q) && !on('/billing')) {
      actions.push({ label: 'Billing', type: 'navigate', target: '/billing' });
    }

    // Two is a helpful nudge; more is a wall of buttons.
    return actions.slice(0, 2);
  }

  /**
   * Assemble the prompt and stream the reply.
   *
   * Account context is read from the database, never taken from the request —
   * otherwise a user could claim any plan or credit balance and have the
   * assistant repeat it back as fact.
   */
  async *streamReply(
    userId: string,
    message: string,
    history: ChatTurn[],
    context: AssistantContext,
  ): AsyncGenerator<string> {
    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty.');
    }
    if (trimmed.length > MAX_MESSAGE_CHARS) {
      throw new BadRequestException(
        `Message is too long. Keep it under ${MAX_MESSAGE_CHARS} characters.`,
      );
    }
    if (!this.llm.isConfigured) {
      throw new ServiceUnavailableException('The assistant is not available right now.');
    }

    let subscription: string | undefined;
    let creditsRemaining: number | undefined;
    try {
      const profile = await this.usersRepo.getById(userId);
      subscription = profile?.subscription_tier;
      creditsRemaining = profile?.credits;
    } catch (err) {
      // Context is a nicety. Losing it should degrade the answer, not block it.
      this.logger.warn(
        `Could not load profile context for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const messages: ChatTurn[] = [
      {
        role: 'system',
        content: buildSystemPrompt({ ...context, subscription, creditsRemaining }),
      },
      // Only user/assistant turns are replayed: a "system" turn arriving from
      // the client would be an instruction injection.
      ...history
        .filter((t) => t.role === 'user' || t.role === 'assistant')
        .slice(-MAX_HISTORY_TURNS)
        .map((t) => ({ role: t.role, content: String(t.content).slice(0, MAX_MESSAGE_CHARS) })),
      { role: 'user', content: trimmed },
    ];

    yield* this.llm.streamChat(messages);
  }
}
