import 'reflect-metadata';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import type { AuthUser } from '../src/common/guards/jwt-auth.guard';

/**
 * Drop-in replacement for the real JwtAuthGuard in e2e tests.
 *
 * The real guard verifies a Supabase-issued JWT against a remote JWKS (or an
 * HS256 secret) — exercising that is out of scope here (owned by the
 * common/ test suite) and would require real network/secret setup. This
 * stand-in reproduces the two behaviors the videos/clips/channels e2e specs
 * actually need to exercise:
 *   - @Public() routes bypass auth entirely, exactly like the real guard.
 *   - Everything else requires the exact TEST_BEARER_TOKEN; anything else
 *     (missing header, wrong token) is rejected with the same
 *     UnauthorizedException the real guard throws for a missing/invalid
 *     header.
 * On success it attaches TEST_USER to the request, just like the real guard
 * attaches the verified JWT claims.
 */
export const TEST_BEARER_TOKEN = 'Bearer e2e-test-token';
export const TEST_USER: AuthUser = { sub: 'user-e2e-1', email: 'user@e2e.test' };

@Injectable()
export class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, context.getHandler()) ||
      Reflect.getMetadata(IS_PUBLIC_KEY, context.getClass());
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const auth = req.headers.authorization;
    if (auth !== TEST_BEARER_TOKEN) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    req.user = TEST_USER;
    return true;
  }
}
