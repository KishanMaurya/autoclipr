import type { LogLevel, StructuredLogContext } from './types';

type LinkingMetadata = Record<string, string | undefined> | import('newrelic').LinkingMetadata;

type LogAgent = {
  getLinkingMetadata?: () => LinkingMetadata;
};

let logAgent: LogAgent | null = null;

export function setStructuredLogAgent(agent: LogAgent | null): void {
  logAgent = agent;
}

export function structuredLog(
  level: LogLevel,
  message: string,
  context: StructuredLogContext = {},
): void {
  const linking = logAgent?.getLinkingMetadata?.() ?? {};
  const { service, traceId, userId, videoId, jobId, ...rest } = context;

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    service: service ?? process.env.NEW_RELIC_APP_NAME ?? 'autoclipr',
    level,
    message,
    traceId: traceId ?? linking['trace.id'] ?? '',
    'trace.id': linking['trace.id'] ?? traceId ?? '',
    'span.id': linking['span.id'] ?? '',
    'entity.name': linking['entity.name'] ?? process.env.NEW_RELIC_APP_NAME ?? '',
    userId,
    videoId,
    jobId,
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
