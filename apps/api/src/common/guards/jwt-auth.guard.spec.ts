import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.Mock;
const mockedCreateRemoteJWKSet = createRemoteJWKSet as jest.Mock;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let config: { get: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
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
    configValues = {};
    config = {
      get: jest.fn((key: string) => configValues[key]),
    };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    mockedCreateRemoteJWKSet.mockReturnValue('jwks-keyset');
    guard = new JwtAuthGuard(config as unknown as ConfigService, reflector as unknown as Reflector);
  });

  it('allows the request through without checking headers when the route is @Public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = buildContext({ headers: {} });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('throws UnauthorizedException when there is no authorization header', async () => {
    const ctx = buildContext({ headers: {} });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing or invalid authorization header',
    );
  });

  it('throws UnauthorizedException when the header does not start with "Bearer "', async () => {
    const ctx = buildContext({ headers: { authorization: 'Basic abc123' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('verifies via Supabase JWKS when supabaseUrl is configured and sets req.user', async () => {
    configValues.supabaseUrl = 'https://proj.supabase.co';
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'user-1', email: 'a@b.com' },
    });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer token123' } };
    const ctx = buildContext(req);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockedCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL('/auth/v1/.well-known/jwks.json', 'https://proj.supabase.co'),
    );
    expect(mockedJwtVerify).toHaveBeenCalledWith('token123', 'jwks-keyset');
    expect(req.user).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('omits email from req.user when the JWT payload email claim is not a string', async () => {
    configValues.supabaseUrl = 'https://proj.supabase.co';
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'user-1', email: 12345 },
    });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer token123' } };
    const ctx = buildContext(req);

    await guard.canActivate(ctx);

    expect(req.user).toEqual({ sub: 'user-1', email: undefined });
  });

  it('caches the JWKS keyset across multiple calls with the same supabaseUrl', async () => {
    configValues.supabaseUrl = 'https://proj.supabase.co';
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });

    await guard.canActivate(buildContext({ headers: { authorization: 'Bearer t1' } }));
    await guard.canActivate(buildContext({ headers: { authorization: 'Bearer t2' } }));

    expect(mockedCreateRemoteJWKSet).toHaveBeenCalledTimes(1);
  });

  it('falls through to HS256 secret verification when JWKS verification fails', async () => {
    configValues.supabaseUrl = 'https://proj.supabase.co';
    configValues.supabaseJwtSecret = 'my-secret';
    mockedJwtVerify
      .mockRejectedValueOnce(new Error('jwks failed'))
      .mockResolvedValueOnce({ payload: { sub: 'user-2' } });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer token123' } };
    const ctx = buildContext(req);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockedJwtVerify).toHaveBeenCalledTimes(2);
    expect(req.user).toEqual({ sub: 'user-2', email: undefined });
  });

  it('falls back to JWT_SECRET config key when supabaseJwtSecret is not set', async () => {
    configValues.JWT_SECRET = 'legacy-secret';
    mockedJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-3' } });
    const req: Record<string, unknown> = { headers: { authorization: 'Bearer token123' } };
    const ctx = buildContext(req);

    await guard.canActivate(ctx);

    expect(req.user).toEqual({ sub: 'user-3', email: undefined });
  });

  it('throws UnauthorizedException when no supabaseUrl and no secret are configured', async () => {
    const ctx = buildContext({ headers: { authorization: 'Bearer token123' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow('JWT secret not configured');
  });

  it('throws UnauthorizedException when JWKS fails and no secret is configured as fallback', async () => {
    configValues.supabaseUrl = 'https://proj.supabase.co';
    mockedJwtVerify.mockRejectedValueOnce(new Error('jwks failed'));
    const ctx = buildContext({ headers: { authorization: 'Bearer token123' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow('JWT secret not configured');
  });

  it('throws UnauthorizedException when HS256 verification fails', async () => {
    configValues.supabaseJwtSecret = 'my-secret';
    mockedJwtVerify.mockRejectedValueOnce(new Error('bad signature'));
    const ctx = buildContext({ headers: { authorization: 'Bearer token123' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid or expired token');
  });

  it('throws UnauthorizedException when the verified payload has no sub claim', async () => {
    configValues.supabaseJwtSecret = 'my-secret';
    mockedJwtVerify.mockResolvedValueOnce({ payload: {} });
    const ctx = buildContext({ headers: { authorization: 'Bearer token123' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid token claims');
  });
});
