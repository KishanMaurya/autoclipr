import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { ActionLoggingInterceptor } from './action-logging.interceptor';
import { AutocliprRequest } from '../types/request.types';

describe('ActionLoggingInterceptor', () => {
  let monitoring: { logAction: jest.Mock };
  let interceptor: ActionLoggingInterceptor;

  function buildContext(
    type: 'http' | 'rpc' | 'ws',
    request: Partial<AutocliprRequest>,
  ): ExecutionContext {
    return {
      getType: () => type,
      getHandler: () => function testMethod() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  function buildHandler(observable: Observable<unknown>): CallHandler {
    return { handle: () => observable } as CallHandler;
  }

  beforeEach(() => {
    monitoring = { logAction: jest.fn() };
    interceptor = new ActionLoggingInterceptor(monitoring as any);
  });

  it('bypasses logging entirely for non-http execution contexts', async () => {
    const ctx = buildContext('rpc', {});
    const handler = buildHandler(of('result'));

    const result = await firstValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toBe('result');
    expect(monitoring.logAction).not.toHaveBeenCalled();
  });

  it('logs an ActionStart immediately and ActionSuccess when the handler completes', async () => {
    const ctx = buildContext('http', {
      params: {},
      query: {},
      user: { sub: 'user-1' },
      correlationId: 'corr-1',
    });
    const handler = buildHandler(of({ id: 42 }));

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(monitoring.logAction).toHaveBeenCalledTimes(2);
    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      1,
      'start',
      'TestController.testMethod',
      expect.objectContaining({
        correlationId: 'corr-1',
        userId: 'user-1',
        action: 'TestController.testMethod',
        controller: 'TestController',
        handler: 'testMethod',
        params: undefined,
      }),
    );
    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      2,
      'success',
      'TestController.testMethod',
      expect.objectContaining({
        durationMs: expect.any(Number),
        resultSummary: '{"id":42}',
      }),
    );
  });

  it('falls back to req.user.id when req.user.sub is absent', async () => {
    const ctx = buildContext('http', { params: {}, query: {}, user: { id: 'user-2' } });
    const handler = buildHandler(of('ok'));

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      1,
      'start',
      expect.any(String),
      expect.objectContaining({ userId: 'user-2' }),
    );
  });

  it('serializes merged params and query when either is non-empty', async () => {
    const ctx = buildContext('http', {
      params: { id: '1' },
      query: { page: '2' },
    });
    const handler = buildHandler(of('ok'));

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      1,
      'start',
      expect.any(String),
      expect.objectContaining({ params: '{"id":"1","page":"2"}' }),
    );
  });

  it('omits resultSummary when the handler resolves with null or undefined', async () => {
    const ctx = buildContext('http', { params: {}, query: {} });
    const handler = buildHandler(of(null));

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      2,
      'success',
      expect.any(String),
      expect.objectContaining({ resultSummary: undefined }),
    );
  });

  it('truncates a resultSummary longer than 2000 characters', async () => {
    const bigString = 'x'.repeat(3000);
    const ctx = buildContext('http', { params: {}, query: {} });
    const handler = buildHandler(of(bigString));

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const successCall = monitoring.logAction.mock.calls[1];
    const summary = successCall[2].resultSummary as string;
    expect(summary.endsWith('…')).toBe(true);
    expect(summary.length).toBe(2001);
  });

  it('logs an ActionFailure with error message and http status when the handler errors', async () => {
    const ctx = buildContext('http', { params: {}, query: {} });
    const error = { status: 404, message: 'Not found' };
    const handler = buildHandler(throwError(() => error) as any);

    await expect(lastValueFrom(interceptor.intercept(ctx, handler))).rejects.toEqual(error);

    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      2,
      'failure',
      expect.any(String),
      expect.objectContaining({
        errorMessage: 'Not found',
        httpStatus: 404,
      }),
    );
  });

  it('defaults errorMessage to "Unknown error" when the thrown error has no message', async () => {
    const ctx = buildContext('http', { params: {}, query: {} });
    const handler = buildHandler(throwError(() => ({})) as any);

    await expect(lastValueFrom(interceptor.intercept(ctx, handler))).rejects.toEqual({});

    expect(monitoring.logAction).toHaveBeenNthCalledWith(
      2,
      'failure',
      expect.any(String),
      expect.objectContaining({ errorMessage: 'Unknown error', httpStatus: undefined }),
    );
  });
});
