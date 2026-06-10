import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthUser {
  sub: string;
  email?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = auth.slice(7);
    const payload = await this.verifyToken(token);

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token claims');
    }

    req.user = {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
    return true;
  }

  private async verifyToken(token: string): Promise<JWTPayload> {
    const secret =
      this.config.get<string>('supabaseJwtSecret') ||
      this.config.get<string>('JWT_SECRET');
    const supabaseUrl = this.config.get<string>('supabaseUrl');

    if (supabaseUrl) {
      try {
        const { payload } = await jwtVerify(token, this.getJwks(supabaseUrl));
        return payload;
      } catch {
        // Fall through to HS256 for legacy Supabase projects.
      }
    }

    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getJwks(supabaseUrl: string) {
    if (!this.jwks) {
      const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
      this.jwks = createRemoteJWKSet(jwksUrl);
    }
    return this.jwks;
  }
}
