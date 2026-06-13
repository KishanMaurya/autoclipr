import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, type AuthUser } from './jwt-auth.guard';

/** Sets req.user when a valid Bearer token is present; never blocks the request. */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return true;
    }

    try {
      const token = auth.slice(7);
      const payload = await this.verifyToken(token);
      if (payload.sub) {
        req.user = {
          sub: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : undefined,
        };
      }
    } catch {
      // Anonymous feedback is allowed.
    }

    return true;
  }
}
