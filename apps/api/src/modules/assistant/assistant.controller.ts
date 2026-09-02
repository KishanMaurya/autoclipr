import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { THROTTLE } from '../../config/throttle.config';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './dto/assistant.dto';

@ApiTags('Assistant')
@ApiBearerAuth('JWT')
@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  /**
   * Streamed support answer, as Server-Sent Events.
   *
   * Streaming because a reply takes seconds to generate and watching it arrive
   * is the difference between the widget feeling instant and feeling broken.
   *
   * Rate limited to the expensive bucket: every call costs real model tokens,
   * so this is not ordinary traffic. Authenticated for the same reason — the
   * provider key must never be reachable without a session.
   */
  @Post('chat')
  @Throttle({ default: THROTTLE.expensive })
  @ApiOperation({
    summary: 'Ask the AutoClipr assistant',
    description:
      'Streams the reply as SSE. Emits `data: {"delta":"..."}` chunks, then a final `data: {"done":true,"actions":[...]}`, then `[DONE]`.',
  })
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() dto: AssistantChatDto,
    @Res() res: Response,
  ): Promise<void> {
    const context = dto.context ?? {};

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Nginx and similar proxies buffer by default, which would hold the whole
    // reply until completion and defeat the point of streaming.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      for await (const delta of this.service.streamReply(
        user.sub,
        dto.message,
        dto.history ?? [],
        context,
      )) {
        send({ delta });
      }

      send({ done: true, actions: this.service.buildActions(dto.message, context) });
    } catch (err) {
      // The stream has already begun, so an HTTP error status is no longer
      // available — the failure has to travel as an event the client renders.
      const message =
        (err as { response?: { message?: string } })?.response?.message ??
        (err instanceof Error ? err.message : 'Something went wrong.');
      send({ error: message });
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
