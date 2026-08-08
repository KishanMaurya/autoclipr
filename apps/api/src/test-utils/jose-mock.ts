/**
 * Jest module mock for the `jose` package.
 *
 * `jose` v6 ships as pure ESM with no CJS build, which ts-jest (running in
 * CommonJS mode) cannot `require()`. It's only reachable transitively — via
 * `JwtAuthGuard` (apps/api/src/common/guards/jwt-auth.guard.ts), imported by
 * every controller decorated with `@UseGuards(JwtAuthGuard)`. Actual JWT
 * verification is out of scope for the videos/clips/channels test suites
 * (covered separately for the common/ module), so this stub just needs to
 * satisfy the import graph, not behave correctly.
 */
export function createRemoteJWKSet(): unknown {
  return jest.fn();
}

export function jwtVerify(): never {
  throw new Error('jwtVerify is mocked in tests — see src/test-utils/jose-mock.ts');
}

export type JWTPayload = Record<string, unknown>;
