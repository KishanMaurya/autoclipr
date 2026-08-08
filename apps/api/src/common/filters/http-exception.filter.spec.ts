import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ApiResponse } from '../api-response';
import { AutocliprRequest } from '../types/request.types';

describe('HttpExceptionFilter', () => {
  let monitoring: {
    logAction: jest.Mock;
    noticeError: jest.Mock;
    logWarn: jest.Mock;
  };
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let response: { status: jest.Mock; json: jest.Mock };

  function buildHost(request: Partial<AutocliprRequest>): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
        getNext: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    monitoring = {
      logAction: jest.fn(),
      noticeError: jest.fn(),
      logWarn: jest.fn(),
    };
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    response = { status: statusMock, json: jsonMock };
    filter = new HttpExceptionFilter(monitoring as any);
  });

  const baseRequest: Partial<AutocliprRequest> = {
    correlationId: 'corr-1',
    method: 'GET',
    originalUrl: '/api/videos',
    user: { sub: 'user-1' },
  };

  it('handles an HttpException with a string response body', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('NOT_FOUND', 'Not found'),
    );
  });

  it('handles an HttpException with an object response containing a string message', () => {
    const exception = new HttpException(
      { message: 'Bad input', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('BAD_REQUEST', 'Bad input'),
    );
  });

  it('joins an array of validation messages into a single string', () => {
    const exception = new HttpException(
      { message: ['field a is required', 'field b is invalid'] },
      HttpStatus.BAD_REQUEST,
    );
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail(
        'BAD_REQUEST',
        'field a is required, field b is invalid',
      ),
    );
  });

  it('falls back to the default message when the response object has no message key', () => {
    const exception = new HttpException({ error: 'weird' }, HttpStatus.BAD_REQUEST);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('BAD_REQUEST', 'An unexpected error occurred'),
    );
  });

  it('falls back to HTTP_ERROR code when the status has no HttpStatus reverse mapping', () => {
    const exception = new HttpException('weird status', 599 as HttpStatus);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('HTTP_ERROR', 'weird status'),
    );
  });

  it('treats a plain Error as a 500 with its own message', () => {
    const exception = new Error('boom');
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('INTERNAL_ERROR', 'boom'),
    );
  });

  it('rewrites ENOTFOUND base errors with a friendlier DATABASE_URL message', () => {
    const exception = new Error('getaddrinfo ENOTFOUND base');
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail(
        'INTERNAL_ERROR',
        'DATABASE_URL is malformed (duplicate DATABASE_URL= prefix or special characters in password).',
      ),
    );
  });

  it('rewrites ENOTFOUND db.*.supabase.co errors with a Supabase connectivity hint', () => {
    const exception = new Error('getaddrinfo ENOTFOUND db.myproj.supabase.co');
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    const [, message] = jsonMock.mock.calls[0][0].error
      ? [null, jsonMock.mock.calls[0][0].error.message]
      : [null, undefined];
    expect(message).toContain('Cannot reach Supabase Postgres');
  });

  it('handles a non-Error, non-HttpException thrown value with the generic 500 fallback', () => {
    const host = buildHost(baseRequest);

    filter.catch('a raw string throw', host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('INTERNAL_ERROR', 'An unexpected error occurred'),
    );
  });

  it('calls monitoring.logAction for every exception with correlation and user context', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(monitoring.logAction).toHaveBeenCalledWith('failure', 'HttpException', {
      correlationId: 'corr-1',
      userId: 'user-1',
      httpStatus: HttpStatus.NOT_FOUND,
      httpMethod: 'GET',
      httpPath: '/api/videos',
      errorMessage: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  it('falls back to request.user.id when request.user.sub is absent', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const host = buildHost({ ...baseRequest, user: { id: 'user-2' } as any });

    filter.catch(exception, host);

    expect(monitoring.logAction).toHaveBeenCalledWith(
      'failure',
      'HttpException',
      expect.objectContaining({ userId: 'user-2' }),
    );
  });

  it('leaves userId undefined when request.user is absent entirely', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const host = buildHost({ ...baseRequest, user: undefined });

    filter.catch(exception, host);

    expect(monitoring.logAction).toHaveBeenCalledWith(
      'failure',
      'HttpException',
      expect.objectContaining({ userId: undefined }),
    );
  });

  it('calls monitoring.noticeError for 5xx statuses and not logWarn', () => {
    const exception = new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(monitoring.noticeError).toHaveBeenCalledTimes(1);
    expect(monitoring.noticeError).toHaveBeenCalledWith(
      exception,
      expect.objectContaining({
        correlationId: 'corr-1',
        userId: 'user-1',
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        httpMethod: 'GET',
        httpPath: '/api/videos',
        code: 'INTERNAL_SERVER_ERROR',
      }),
    );
    expect(monitoring.logWarn).not.toHaveBeenCalled();
  });

  it('falls back to request.user.id (not sub) inside the noticeError context for 5xx errors', () => {
    const exception = new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR);
    const host = buildHost({ ...baseRequest, user: { id: 'user-9' } as any });

    filter.catch(exception, host);

    expect(monitoring.noticeError).toHaveBeenCalledWith(
      exception,
      expect.objectContaining({ userId: 'user-9' }),
    );
  });

  it('wraps a non-Error exception in a new Error before passing it to noticeError', () => {
    const host = buildHost(baseRequest);

    filter.catch('raw string', host);

    expect(monitoring.noticeError).toHaveBeenCalledTimes(1);
    const [errArg] = monitoring.noticeError.mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg.message).toBe('An unexpected error occurred');
  });

  it('calls monitoring.logWarn for 4xx statuses and not noticeError', () => {
    const exception = new HttpException('Bad input', HttpStatus.BAD_REQUEST);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(monitoring.logWarn).toHaveBeenCalledTimes(1);
    expect(monitoring.logWarn).toHaveBeenCalledWith(
      'Client error: GET /api/videos — Bad input',
      expect.objectContaining({
        correlationId: 'corr-1',
        userId: 'user-1',
        httpStatus: HttpStatus.BAD_REQUEST,
        code: 'BAD_REQUEST',
      }),
    );
    expect(monitoring.noticeError).not.toHaveBeenCalled();
  });

  it('calls neither noticeError nor logWarn for statuses below 400', () => {
    // HttpException permits any numeric status; use one below the 4xx range.
    const exception = new HttpException('redirect-ish', 302 as HttpStatus);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(monitoring.noticeError).not.toHaveBeenCalled();
    expect(monitoring.logWarn).not.toHaveBeenCalled();
  });

  it('always responds with the computed status and a failure ApiResponse body', () => {
    const exception = new HttpException('Bad input', HttpStatus.BAD_REQUEST);
    const host = buildHost(baseRequest);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      ApiResponse.fail('BAD_REQUEST', 'Bad input'),
    );
  });
});
