/** Rate-limit windows (ms) and per-IP limits — see @nestjs/throttler. */
export const THROTTLE = {
  /** General API traffic */
  default: { name: 'default', ttl: 60_000, limit: 120 },
  /** Public unauthenticated endpoints (channel lookup) */
  public: { name: 'public', ttl: 60_000, limit: 30 },
  /** Expensive jobs: URL import, clip generation */
  expensive: { name: 'expensive', ttl: 60_000, limit: 10 },
  /** Auth profile sync */
  auth: { name: 'auth', ttl: 60_000, limit: 30 },
  /** YouTube metrics refresh (external API quota) */
  analyticsRefresh: { name: 'analyticsRefresh', ttl: 60_000, limit: 5 },
} as const;

export const throttlerModuleOptions = Object.values(THROTTLE).map(
  ({ name, ttl, limit }) => ({ name, ttl, limit }),
);
