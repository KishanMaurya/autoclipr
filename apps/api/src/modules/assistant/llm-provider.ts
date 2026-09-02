import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type LlmProviderName = 'openai' | 'deepseek';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Thin abstraction over the chat provider.
 *
 * Deliberately mirrors apps/workers/src/pipeline/llm-client.util.ts — same
 * LLM_PROVIDER switch, same env vars — so there is one convention across the
 * codebase and no second provider to configure. DeepSeek is reached through
 * the OpenAI SDK with a different baseURL, which is why one client covers both.
 *
 * Nothing above this file knows which provider is in use; swapping one in
 * later means changing this file only.
 */
@Injectable()
export class LlmProvider {
  private readonly logger = new Logger(LlmProvider.name);
  private client: OpenAI | null = null;
  private model = '';
  private label = '';

  constructor(private readonly config: ConfigService) {
    this.init();
  }

  private init(): void {
    const raw = (this.config.get<string>('llmProvider') ?? process.env.LLM_PROVIDER ?? 'openai')
      .toLowerCase();
    const provider: LlmProviderName = raw === 'deepseek' ? 'deepseek' : 'openai';

    if (provider === 'deepseek') {
      const apiKey = this.config.get<string>('deepseekApiKey') ?? process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        this.logger.warn('DEEPSEEK_API_KEY missing — the assistant will be unavailable');
        return;
      }
      this.model = this.config.get<string>('deepseekModel') ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
      this.client = new OpenAI({
        apiKey,
        baseURL:
          this.config.get<string>('deepseekBaseUrl') ??
          process.env.DEEPSEEK_BASE_URL ??
          'https://api.deepseek.com',
      });
      this.label = `DeepSeek (${this.model})`;
    } else {
      const apiKey = this.config.get<string>('openaiApiKey') ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        this.logger.warn('OPENAI_API_KEY missing — the assistant will be unavailable');
        return;
      }
      this.model = this.config.get<string>('openaiModel') ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
      this.client = new OpenAI({ apiKey });
      this.label = `OpenAI (${this.model})`;
    }

    this.logger.log(`Assistant LLM: ${this.label}`);
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Stream a reply token by token.
   *
   * Streaming rather than a single response because a support answer takes
   * seconds to generate, and watching it appear is the difference between the
   * widget feeling instant and feeling broken.
   */
  async *streamChat(
    messages: ChatTurn[],
    opts: { maxTokens?: number; temperature?: number } = {},
  ): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('No LLM provider configured');
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      // Support answers should be short. A cap also bounds the cost of a
      // prompt that tries to make the assistant monologue.
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.3,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  /** Non-streaming variant, for callers that just want the finished text. */
  async chat(messages: ChatTurn[], opts: { maxTokens?: number } = {}): Promise<string> {
    let out = '';
    for await (const piece of this.streamChat(messages, opts)) out += piece;
    return out;
  }
}
