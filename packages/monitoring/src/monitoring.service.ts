import { structuredLog, setStructuredLogAgent } from './structured-logger';
import type {
  CustomEventAttributes,
  DistributedTraceHeaders,
  HttpLogDetails,
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

  getSpanId(): string | undefined {
    if (!agent) return undefined;
    return agent.getLinkingMetadata()['span.id'];
  }

  getLinkingContext(): StructuredLogContext {
    if (!agent) {
      return { service: this.serviceName };
    }

    const meta = agent.getLinkingMetadata();
    return {
      service: this.serviceName,
      traceId: meta['trace.id'],
      spanId: meta['span.id'],
    };
  }

  getTraceContext(): StructuredLogContext {
    return this.getLinkingContext();
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
    }, error);
  }

  logWarn(message: string, context: StructuredLogContext = {}): void {
    structuredLog('warn', message, {
      service: this.serviceName,
      traceId: context.traceId ?? this.getTraceId(),
      ...context,
    });
  }

  logInfo(message: string, context: StructuredLogContext = {}): void {
    const linking = this.getLinkingContext();
    structuredLog('info', message, {
      service: this.serviceName,
      traceId: context.traceId ?? linking.traceId,
      spanId: context.spanId ?? linking.spanId,
      ...context,
    });
  }

  logHttpRequest(details: HttpLogDetails): void {
    const linking = this.getLinkingContext();
    const message = `HTTP → ${details.method} ${details.path}`;

    structuredLog('info', message, {
      ...linking,
      eventType: 'HttpRequest',
      correlationId: details.correlationId,
      httpMethod: details.method,
      httpPath: details.path,
      userId: details.userId,
      query: details.query,
      requestBody: details.requestBody,
    });
  }

  logHttpResponse(details: HttpLogDetails): void {
    const linking = this.getLinkingContext();
    const status = details.statusCode ?? 500;
    const message = `HTTP ← ${status} ${details.method} ${details.path} ${details.durationMs ?? 0}ms`;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    structuredLog(level, message, {
      ...linking,
      eventType: 'HttpResponse',
      correlationId: details.correlationId,
      httpMethod: details.method,
      httpPath: details.path,
      httpStatus: status,
      durationMs: details.durationMs,
      userId: details.userId,
      responseBody: details.responseBody,
      errorMessage: details.errorMessage,
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
