import { SignJWT } from 'jose';
import { ConfigService } from '@nestjs/config';

/**
 * Shared helper for e2e specs that need to exercise the *real* JwtAuthGuard
 * (rather than mocking it away). We configure the guard with a known HS256
 * secret via a stub ConfigService, then sign tokens with that same secret so
 * `jose.jwtVerify` inside JwtAuthGuard genuinely validates them.
 */
export const E2E_JWT_SECRET = 'e2e-test-jwt-secret-do-not-use-in-prod';

export function makeStubConfigService(values: Record<string, unknown> = {}): ConfigService {
  const defaults: Record<string, unknown> = {
    JWT_SECRET: E2E_JWT_SECRET,
    supabaseUrl: undefined, // force the HS256 fallback path in JwtAuthGuard
    supabaseJwtSecret: undefined,
    ...values,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
}

export async function signTestToken(payload: { sub: string; email?: string }): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(E2E_JWT_SECRET));
}
