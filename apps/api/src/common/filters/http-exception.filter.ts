import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MonitoringService } from '@autoclipr/monitoring';
import { Response } from 'express';
import { ApiResponse } from '../api-response';
import { AutocliprRequest } from '../types/request.types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitoring: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AutocliprRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string) ?? message;
        if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        }
      }
      code = HttpStatus[status] ?? 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      if (/ENOTFOUND base\b/i.test(message)) {
        message =
          'DATABASE_URL is malformed (duplicate DATABASE_URL= prefix or special characters in password).';
      } else if (/ENOTFOUND db\.\w+\.supabase\.co/i.test(message)) {
        message =
          'Cannot reach Supabase Postgres (DATABASE_URL). In Supabase → Settings → Database, copy the connection URI again. Use the pooler host if direct db.* fails, URL-encode special characters in the password, and ensure the project is not paused.';
      }
    }

    const error =
      exception instanceof Error ? exception : new Error(message);

    this.monitoring.logAction('failure', 'HttpException', {
      correlationId: request.correlationId,
      userId: request.user?.sub ?? request.user?.id,
      httpStatus: status,
      httpMethod: request.method,
      httpPath: request.originalUrl,
      errorMessage: message,
      code,
    });

    if (status >= 500) {
      this.monitoring.noticeError(error, {
        correlationId: request.correlationId,
        userId: request.user?.sub ?? request.user?.id,
        httpStatus: status,
        httpMethod: request.method,
        httpPath: request.originalUrl,
        code,
      });
    } else if (status >= 400) {
      this.monitoring.logWarn(`Client error: ${request.method} ${request.originalUrl} — ${message}`, {
        correlationId: request.correlationId,
        userId: request.user?.sub ?? request.user?.id,
        httpStatus: status,
        code,
      });
    }

    response.status(status).json(ApiResponse.fail(code, message));
  }
}
