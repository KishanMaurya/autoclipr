import type { LogLevel, StructuredLogContext } from './types';

export function structuredLog(
  level: LogLevel,
  message: string,
  context: StructuredLogContext = {},
): void {
  const { service, traceId, userId, videoId, jobId, ...rest } = context;

  const entry = {
    timestamp: new Date().toISOString(),
    service: service ?? process.env.NEW_RELIC_APP_NAME ?? 'autoclipr',
    traceId: traceId ?? '',
    userId,
    videoId,
    jobId,
    level,
    message,
    ...rest,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}
