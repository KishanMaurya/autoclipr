import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.Mock;

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let config: { get: jest.Mock };
  let configValues: Record<string, string | undefined>;

  function buildContext(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configValues = { supabaseJwtSecret: 'my-secret' };
    config = { get: jest.fn((key: string) => configValues[key]) };
    guard = new OptionalJwtAuthGuard(
      config as unknown as ConfigService,
      { getAllAndOverride: jest.fn() } as unknown as Reflector,
    );
  });

  it('returns true and leaves req.user unset when there is no authorization header', async () => {
    const req: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
    expect(mockedJwtVerify).not.toHaveBeenCalled();
  });

  it('returns true and leaves req.user unset when the header is not a Bearer token', async () => {
    const req: Record<string, unknown> = { headers: { authorization: 'Basic xyz' } };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('sets req.user when the bearer token verifies successfully', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-1', email: 'a@b.com' } });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer good-token' } };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('omits email from req.user when the JWT payload email claim is not a string', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-1', email: 999 } });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer good-token' } };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toEqual({ sub: 'user-1', email: undefined });
  });

  it('leaves req.user unset when the verified payload has no sub claim', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: {} });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer good-token' } };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('swallows verification errors and still returns true without setting req.user', async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error('invalid signature'));
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer bad-token' } };

    await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });
});
