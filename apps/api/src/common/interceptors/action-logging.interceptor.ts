import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { MonitoringService } from '@autoclipr/monitoring';
import { Observable, tap } from 'rxjs';
import { AutocliprRequest } from '../types/request.types';
import { formatJsonForLog } from '../utils/log-sanitize.util';

function summarizeResult(result: unknown): string | undefined {
  if (result === undefined || result === null) return undefined;
  const text = formatJsonForLog(result, { pretty: false });
  return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}

@Injectable()
export class ActionLoggingInterceptor implements NestInterceptor {
  constructor(private readonly monitoring: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    const action = `${className}.${methodName}`;

    const req = context.switchToHttp().getRequest<AutocliprRequest>();
    const userId = req.user?.sub ?? req.user?.id;
    const correlationId = req.correlationId;
    const params =
      Object.keys({ ...req.params, ...req.query }).length > 0
        ? formatJsonForLog({ ...req.params, ...req.query }, { pretty: false })
        : undefined;
    const started = Date.now();

    const baseContext = {
      correlationId,
      userId,
      action,
      controller: className,
      handler: methodName,
      params,
    };

    this.monitoring.logAction('start', action, baseContext);

    return next.handle().pipe(
      tap({
        next: (result) => {
          this.monitoring.logAction('success', action, {
            ...baseContext,
            durationMs: Date.now() - started,
            resultSummary: summarizeResult(result),
          });
        },
        error: (err: { status?: number; message?: string }) => {
          this.monitoring.logAction('failure', action, {
            ...baseContext,
            durationMs: Date.now() - started,
            errorMessage: err?.message ?? 'Unknown error',
            httpStatus: err?.status,
          });
        },
      }),
    );
  }
}
