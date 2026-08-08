import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';

/**
 * A lightweight stand-in for JwtAuthGuard used in e2e tests.
 *
 * The real guard verifies JWTs against Supabase's JWKS/HS256 secret (via
 * `jose`) — real network/crypto concerns that belong to the guard's own test
 * coverage (owned by another agent), not to platforms/analytics e2e tests.
 * This fake honors the same contract the controllers rely on: it respects
 * `@Public()` routes, requires `Authorization: Bearer valid-token` otherwise,
 * and attaches `req.user` exactly like the real guard does.
 */
export const E2E_TEST_USER = { sub: 'test-user-id', email: 'test-user@example.com' };
export const E2E_VALID_TOKEN = 'valid-token';

@Injectable()
export class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler()) as boolean | undefined;
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (auth === `Bearer ${E2E_VALID_TOKEN}`) {
      req.user = E2E_TEST_USER;
      return true;
    }
    throw new UnauthorizedException('Missing or invalid authorization header');
  }
}
