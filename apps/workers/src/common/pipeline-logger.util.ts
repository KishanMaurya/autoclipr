import { Logger } from '@nestjs/common';
import { formatForLog } from './log-sanitize.util';

export class PipelineLogger {
  constructor(
    private readonly logger: Logger,
    private readonly videoId: string,
    private readonly jobId?: string,
  ) {}

  private prefix(): string {
    return this.jobId
      ? `[job:${this.jobId.slice(0, 8)}][video:${this.videoId.slice(0, 8)}]`
      : `[video:${this.videoId.slice(0, 8)}]`;
  }

  private emit(level: 'log' | 'warn' | 'error', header: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger[level](`${header}\n${formatForLog(meta)}`);
    } else {
      this.logger[level](header);
    }
  }

  stepStart(step: string, meta?: Record<string, unknown>) {
    this.emit('log', `${this.prefix()} ▶ ${step}`, meta);
  }

  stepDone(step: string, ms: number, meta?: Record<string, unknown>) {
    this.emit('log', `${this.prefix()} ✓ ${step} ${ms}ms`, meta);
  }

  stepFail(step: string, ms: number, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`${this.prefix()} ✗ ${step} ${ms}ms — ${message}`);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.emit('log', `${this.prefix()} ${message}`, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.emit('warn', `${this.prefix()} ${message}`, meta);
  }
}
