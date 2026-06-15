import type { LogLevel, StructuredLogContext } from './types';

type LinkingMetadata = Record<string, string | undefined> | import('newrelic').LinkingMetadata;

type NrLogEvent = {
  message: string;
  level?: string;
  timestamp?: number;
  error?: Error;
  [key: string]: string | number | boolean | Error | undefined;
};

type LogAgent = {
  getLinkingMetadata?: () => LinkingMetadata;
  recordLogEvent?: (logEvent: NrLogEvent) => void;
};

let logAgent: LogAgent | null = null;

export function setStructuredLogAgent(agent: LogAgent | null): void {
  logAgent = agent;
}

function resolveLogAgent(): LogAgent | null {
  if (logAgent) return logAgent;
  if (!process.env.NEW_RELIC_LICENSE_KEY?.trim()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    logAgent = require('newrelic') as LogAgent;
    return logAgent;
  } catch {
    return null;
  }
}

function toNrLevel(level: LogLevel): string {
  return level.toUpperCase();
}

function cleanLogAttributes(
  attributes: Record<string, unknown>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(attributes).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        typeof value !== 'object',
    ),
  ) as Record<string, string | number | boolean>;
}

export function structuredLog(
  level: LogLevel,
  message: string,
  context: StructuredLogContext = {},
  error?: Error,
): void {
  const linking = logAgent?.getLinkingMetadata?.() ?? resolveLogAgent()?.getLinkingMetadata?.() ?? {};
  const { service, traceId, spanId, correlationId, userId, videoId, jobId, ...rest } = context;

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    service: service ?? process.env.NEW_RELIC_APP_NAME ?? 'autoclipr',
    level,
    message,
    correlationId: correlationId ?? '',
    traceId: traceId ?? linking['trace.id'] ?? '',
    spanId: spanId ?? linking['span.id'] ?? '',
    'trace.id': linking['trace.id'] ?? traceId ?? '',
    'span.id': linking['span.id'] ?? spanId ?? '',
    'entity.name': linking['entity.name'] ?? process.env.NEW_RELIC_APP_NAME ?? '',
    userId,
    videoId,
    jobId,
    ...rest,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  // Console forwarding does not reliably capture custom JSON logs — use the NR API.
  resolveLogAgent()?.recordLogEvent?.({
    message,
    level: toNrLevel(level),
    timestamp: Date.now(),
    error,
    ...cleanLogAttributes({
      service: entry.service as string,
      correlationId: entry.correlationId as string,
      traceId: entry.traceId as string,
      spanId: entry.spanId as string,
      userId: entry.userId as string | undefined,
      videoId: entry.videoId as string | undefined,
      jobId: entry.jobId as string | undefined,
      eventType: entry.eventType as string | undefined,
      httpMethod: entry.httpMethod as string | undefined,
      httpPath: entry.httpPath as string | undefined,
      httpStatus: entry.httpStatus as number | undefined,
      durationMs: entry.durationMs as number | undefined,
      query: entry.query as string | undefined,
      requestBody: entry.requestBody as string | undefined,
      responseBody: entry.responseBody as string | undefined,
      errorMessage: entry.errorMessage as string | undefined,
      ...rest,
    }),
  });
}
