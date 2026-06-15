import { structuredLog, setStructuredLogAgent } from './structured-logger';
import type {
  CustomEventAttributes,
  DistributedTraceHeaders,
  StructuredLogContext,
} from './types';

type NewRelicAgent = typeof import('newrelic');

let agent: NewRelicAgent | null = null;

export function loadNewRelic(): boolean {
  if (agent) return true;
  if (!process.env.NEW_RELIC_LICENSE_KEY?.trim()) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  agent = require('newrelic') as NewRelicAgent;
  setStructuredLogAgent(agent);
  return true;
}

export function isMonitoringEnabled(): boolean {
  return agent !== null;
}

function cleanAttributes(
  attributes: CustomEventAttributes,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(attributes).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as Record<string, string | number | boolean>;
}

export class MonitoringService {
  constructor(private readonly serviceName: string) {}

  getTraceId(): string | undefined {
    if (!agent) return undefined;
    return agent.getLinkingMetadata()['trace.id'];
  }

  getTraceContext(): StructuredLogContext {
    if (!agent) {
      return { service: this.serviceName };
    }

    const meta = agent.getLinkingMetadata();
    return {
      service: this.serviceName,
      traceId: meta['trace.id'],
    };
  }

  /** Capture NR trace headers to attach to BullMQ job payloads. */
  insertDistributedTraceHeaders(
    headers: DistributedTraceHeaders = {},
  ): DistributedTraceHeaders {
    if (!agent) return headers;

    const tx = agent.getTransaction();
    if (tx) {
      tx.insertDistributedTraceHeaders(headers);
    }
    return headers;
  }

  acceptDistributedTraceHeaders(
    headers?: DistributedTraceHeaders,
  ): void {
    if (!agent || !headers || Object.keys(headers).length === 0) return;

    const tx = agent.getTransaction();
    if (tx) {
      tx.acceptDistributedTraceHeaders('Queue', headers);
    }
  }

  recordEvent(
    eventType: string,
    attributes: CustomEventAttributes = {},
  ): void {
    const payload = cleanAttributes(attributes);

    if (agent) {
      agent.recordCustomEvent(eventType, payload);
    }

    structuredLog('info', eventType, {
      service: this.serviceName,
      traceId: this.getTraceId(),
      userId: payload.userId as string | undefined,
      videoId: payload.videoId as string | undefined,
      jobId: payload.jobId as string | undefined,
      eventType,
      ...payload,
    });
  }

  recordMetric(name: string, value: number): void {
    if (agent) {
      agent.recordMetric(name, value);
    }
  }

  noticeError(
    error: Error,
    context: StructuredLogContext = {},
  ): void {
    const attrs = cleanAttributes({
      service: this.serviceName,
      traceId: context.traceId ?? this.getTraceId(),
      userId: context.userId,
      videoId: context.videoId,
      jobId: context.jobId,
      ...(context as CustomEventAttributes),
    });

    if (agent) {
      agent.noticeError(error, attrs);
    }

    structuredLog('error', error.message, {
      service: this.serviceName,
      traceId: context.traceId ?? this.getTraceId(),
      ...context,
    });
  }

  logWarn(message: string, context: StructuredLogContext = {}): void {
    structuredLog('warn', message, {
      service: this.serviceName,
      traceId: context.traceId ?? this.getTraceId(),
      ...context,
    });
  }

  logInfo(message: string, context: StructuredLogContext = {}): void {
    structuredLog('info', message, {
      service: this.serviceName,
      traceId: context.traceId ?? this.getTraceId(),
      ...context,
    });
  }

  async withBackgroundTransaction<T>(
    name: string,
    group: string,
    handler: () => Promise<T>,
    traceHeaders?: DistributedTraceHeaders,
  ): Promise<T> {
    if (!agent) {
      return handler();
    }

    return new Promise<T>((resolve, reject) => {
      agent!.startBackgroundTransaction(name, group, () => {
        const run = async () => {
          try {
            this.acceptDistributedTraceHeaders(traceHeaders);
            resolve(await handler());
          } catch (err) {
            reject(err);
          } finally {
            agent!.endTransaction();
          }
        };

        void run();
      });
    });
  }

  startSegment<T>(name: string, handler: () => T): T {
    if (!agent) {
      return handler();
    }

    return agent.startSegment(name, true, handler);
  }
}
