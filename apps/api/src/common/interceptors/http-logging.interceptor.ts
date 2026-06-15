import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { MonitoringService } from '@autoclipr/monitoring';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { shouldLogHttpBodies } from '../utils/http-log.util';
import { formatJsonForLog } from '../utils/log-sanitize.util';

type AutocliprRequest = Request & {
  correlationId?: string;
  user?: { sub?: string; id?: string };
};

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly monitoring: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AutocliprRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, query, params, body, headers } = req;
    const correlationId =
      (headers['x-correlation-id'] as string) ??
      (headers['x-request-id'] as string) ??
      randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Request-Id', correlationId);

    const started = Date.now();
    const logBodies = shouldLogHttpBodies();
    const userId = req.user?.sub ?? req.user?.id;
    const queryString =
      Object.keys(query ?? {}).length > 0 ? formatJsonForLog(query, { pretty: false }) : undefined;
    const requestBody = this.formatBody({
      query,
      params,
      body,
      userId,
    });

    this.monitoring.logHttpRequest({
      correlationId,
      method,
      path: originalUrl,
      userId,
      query: queryString,
      requestBody,
    });

    const reqHeader = `→ [${correlationId}] ${method} ${originalUrl}`;
    if (logBodies && requestBody) {
      console.log(`${reqHeader}\n${requestBody}`);
    } else {
      console.log(reqHeader);
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const statusCode = res.statusCode;
          const durationMs = Date.now() - started;
          const formattedResponse = this.formatBody(responseBody);

          this.monitoring.logHttpResponse({
            correlationId,
            method,
            path: originalUrl,
            statusCode,
            durationMs,
            userId,
            responseBody: formattedResponse,
          });

          const respHeader = `← [${correlationId}] ${method} ${originalUrl} ${statusCode} ${durationMs}ms`;
          if (logBodies && formattedResponse) {
            console.log(`${respHeader}\n${formattedResponse}`);
          } else {
            console.log(respHeader);
          }
        },
        error: (err: { status?: number; message?: string; response?: unknown }) => {
          const durationMs = Date.now() - started;
          const statusCode = err?.status ?? 500;
          const formattedResponse = err?.response ? this.formatBody(err.response) : undefined;

          this.monitoring.logHttpResponse({
            correlationId,
            method,
            path: originalUrl,
            statusCode,
            durationMs,
            userId,
            responseBody: formattedResponse,
            errorMessage: err?.message ?? 'Error',
          });

          const respHeader = `← [${correlationId}] ${method} ${originalUrl} ${statusCode} ${durationMs}ms ${err?.message ?? 'Error'}`;
          if (formattedResponse) {
            console.error(`${respHeader}\n${formattedResponse}`);
          } else {
            console.error(respHeader);
          }
        },
      }),
    );
  }

  private formatBody(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'object' && Object.keys(value as object).length === 0) {
      return undefined;
    }
    return formatJsonForLog(value, { pretty: false });
  }
}
