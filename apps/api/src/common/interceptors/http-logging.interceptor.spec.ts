import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { shouldLogHttpBodies } from '../utils/http-log.util';
import { AutocliprRequest } from '../types/request.types';

jest.mock('../utils/http-log.util', () => ({
  shouldLogHttpBodies: jest.fn(),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

const mockedShouldLogHttpBodies = shouldLogHttpBodies as jest.Mock;

describe('HttpLoggingInterceptor', () => {
  let monitoring: { logHttpRequest: jest.Mock; logHttpResponse: jest.Mock };
  let interceptor: HttpLoggingInterceptor;
  let setHeaderMock: jest.Mock;
  let response: { statusCode: number; setHeader: jest.Mock };
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  function buildContext(
    type: 'http' | 'rpc',
    request: Partial<AutocliprRequest>,
  ): ExecutionContext {
    return {
      getType: () => type,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  function buildHandler(observable: Observable<unknown>): CallHandler {
    return { handle: () => observable } as CallHandler;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedShouldLogHttpBodies.mockReturnValue(false);
    monitoring = { logHttpRequest: jest.fn(), logHttpResponse: jest.fn() };
    setHeaderMock = jest.fn();
    response = { statusCode: 200, setHeader: setHeaderMock };
    interceptor = new HttpLoggingInterceptor(monitoring as any);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('bypasses everything for non-http execution contexts', async () => {
    const ctx = buildContext('rpc', {});
    const handler = buildHandler(of('result'));

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toBe('result');
    expect(monitoring.logHttpRequest).not.toHaveBeenCalled();
    expect(setHeaderMock).not.toHaveBeenCalled();
  });

  it('uses x-correlation-id header when present', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: { 'x-correlation-id': 'corr-from-header' },
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(req.correlationId).toBe('corr-from-header');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Correlation-Id', 'corr-from-header');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Request-Id', 'corr-from-header');
  });

  it('falls back to x-request-id header when x-correlation-id is absent', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: { 'x-request-id': 'req-from-header' },
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(req.correlationId).toBe('req-from-header');
  });

  it('generates a correlation id when neither header is present', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(req.correlationId).toBe('generated-uuid');
  });

  it('logs the request with a formatted query string when query params are present', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x?page=2',
      headers: {},
      query: { page: '2' },
      params: {},
      user: { sub: 'user-1' },
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(monitoring.logHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/x?page=2',
        userId: 'user-1',
        query: '{"page":"2"}',
      }),
    );
  });

  it('omits the query field when there are no query params', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(monitoring.logHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ query: undefined }),
    );
  });

  it('omits the query field when req.query is undefined entirely', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: undefined,
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(monitoring.logHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ query: undefined }),
    );
  });

  it('falls back to req.user.id when req.user.sub is absent', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
      user: { id: 'user-2' },
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    expect(monitoring.logHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
  });

  it('logs only the request header line to console when body logging is disabled', async () => {
    mockedShouldLogHttpBodies.mockReturnValue(false);
    const req: Partial<AutocliprRequest> = {
      method: 'POST',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
      body: { a: 1 },
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    const reqLogLine = consoleLogSpy.mock.calls[0][0] as string;
    expect(reqLogLine).toMatch(/^→ \[generated-uuid\] POST \/api\/x$/);
  });

  it('logs the request body to console when body logging is enabled and a body is present', async () => {
    mockedShouldLogHttpBodies.mockReturnValue(true);
    const req: Partial<AutocliprRequest> = {
      method: 'POST',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
      body: { a: 1 },
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of('ok'))));

    const reqLogLine = consoleLogSpy.mock.calls[0][0] as string;
    expect(reqLogLine).toContain('→ [generated-uuid] POST /api/x');
    expect(reqLogLine).toContain('"a":1');
  });

  it('logs response success with status, duration, and formatted response body', async () => {
    mockedShouldLogHttpBodies.mockReturnValue(true);
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    response.statusCode = 201;
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of({ id: 1 }))));

    expect(monitoring.logHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 201,
        responseBody: '{"id":1}',
      }),
    );
    const respLogLine = consoleLogSpy.mock.calls[1][0] as string;
    expect(respLogLine).toContain('← [generated-uuid] GET /api/x 201');
    expect(respLogLine).toContain('"id":1');
  });

  it('omits responseBody when the handler resolves with an empty object', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of({}))));

    expect(monitoring.logHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({ responseBody: undefined }),
    );
  });

  it('omits responseBody when the handler resolves with null', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);
    await lastValueFrom(interceptor.intercept(ctx, buildHandler(of(null))));

    expect(monitoring.logHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({ responseBody: undefined }),
    );
  });

  it('logs an error response with status from the error, formatted err.response body, and console.error', async () => {
    mockedShouldLogHttpBodies.mockReturnValue(false);
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const error = { status: 404, message: 'Not found', response: { error: 'Not found' } };
    const ctx = buildContext('http', req);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, buildHandler(throwError(() => error) as any))),
    ).rejects.toEqual(error);

    expect(monitoring.logHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorMessage: 'Not found',
        responseBody: '{"error":"Not found"}',
      }),
    );
    const errLogLine = consoleErrorSpy.mock.calls[0][0] as string;
    expect(errLogLine).toContain('← [generated-uuid] GET /api/x 404');
    expect(errLogLine).toContain('Not found');
    expect(errLogLine).toContain('"error":"Not found"');
  });

  it('defaults error status to 500 and message to "Error" when the thrown error has none', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const ctx = buildContext('http', req);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, buildHandler(throwError(() => ({})) as any))),
    ).rejects.toEqual({});

    expect(monitoring.logHttpResponse).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, errorMessage: 'Error', responseBody: undefined }),
    );
    const errLogLine = consoleErrorSpy.mock.calls[0][0] as string;
    expect(errLogLine).toContain('500');
    expect(errLogLine).toContain('Error');
  });

  it('logs only the error header line when err.response is absent', async () => {
    const req: Partial<AutocliprRequest> = {
      method: 'GET',
      originalUrl: '/api/x',
      headers: {},
      query: {},
      params: {},
    };
    const error = { status: 400, message: 'Bad' };
    const ctx = buildContext('http', req);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, buildHandler(throwError(() => error) as any))),
    ).rejects.toEqual(error);

    expect(consoleErrorSpy.mock.calls[0][0]).not.toContain('\n');
  });
});
