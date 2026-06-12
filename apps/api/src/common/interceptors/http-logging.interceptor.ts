import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { shouldLogHttpBodies } from '../utils/http-log.util';
import { formatJsonForLog } from '../utils/log-sanitize.util';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request & { user?: { sub?: string; id?: string } }>();
    const { method, originalUrl, query, params, body, headers } = req;
    const requestId = (headers['x-request-id'] as string) ?? randomUUID().slice(0, 8);
    const started = Date.now();
    const logBodies = shouldLogHttpBodies();
    const userId = req.user?.sub ?? req.user?.id;

    const reqPayload = {
      query: Object.keys(query ?? {}).length ? query : undefined,
      params: Object.keys(params ?? {}).length ? params : undefined,
      body: logBodies && body && Object.keys(body).length ? body : undefined,
      userId,
    };
    const hasReqPayload = Object.values(reqPayload).some((v) => v !== undefined);
    const reqHeader = `→ [${requestId}] ${method} ${originalUrl}`;

    if (hasReqPayload) {
      console.log(`${reqHeader}\n${formatJsonForLog(reqPayload)}`);
    } else {
      console.log(reqHeader);
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const res = context.switchToHttp().getResponse<Response>();
          const ms = Date.now() - started;
          const respHeader = `← [${requestId}] ${method} ${originalUrl} ${res.statusCode} ${ms}ms`;

          if (logBodies && responseBody !== undefined && responseBody !== '') {
            console.log(`${respHeader}\n${formatJsonForLog(responseBody)}`);
          } else {
            console.log(respHeader);
          }
        },
        error: (err: { status?: number; message?: string; response?: unknown }) => {
          const ms = Date.now() - started;
          const status = err?.status ?? 500;
          const respHeader = `← [${requestId}] ${method} ${originalUrl} ${status} ${ms}ms ${err?.message ?? 'Error'}`;

          if (err?.response) {
            console.error(`${respHeader}\n${formatJsonForLog(err.response)}`);
          } else {
            console.error(respHeader);
          }
        },
      }),
    );
  }
}
