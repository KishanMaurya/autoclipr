import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import type { AuthUser } from './jwt-auth.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  function buildContext(user: AuthUser | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    guard = new AdminGuard();
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it('throws ForbiddenException when there is no user on the request', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    const ctx = buildContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Admin access required.');
  });

  it('throws ForbiddenException when the user has no email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    const ctx = buildContext({ sub: 'user-1' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when ADMIN_EMAILS is unset', () => {
    delete process.env.ADMIN_EMAILS;
    const ctx = buildContext({ sub: 'user-1', email: 'admin@example.com' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user email is not in the admin list', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,root@example.com';
    const ctx = buildContext({ sub: 'user-1', email: 'nobody@example.com' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns true when the user email matches an entry in ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,root@example.com';
    const ctx = buildContext({ sub: 'user-1', email: 'root@example.com' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('matches case-insensitively on both sides', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.com';
    const ctx = buildContext({ sub: 'user-1', email: 'ADMIN@EXAMPLE.COM' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('trims whitespace around entries and ignores empty entries from trailing commas', () => {
    process.env.ADMIN_EMAILS = ' admin@example.com , , root@example.com ,';
    const ctxAdmin = buildContext({ sub: 'user-1', email: 'admin@example.com' });
    const ctxRoot = buildContext({ sub: 'user-2', email: 'root@example.com' });

    expect(guard.canActivate(ctxAdmin)).toBe(true);
    expect(guard.canActivate(ctxRoot)).toBe(true);
  });
});
