/** Rate-limit windows (ms) and per-IP limits — see @nestjs/throttler. */
export const THROTTLE = {
  /** General API traffic */
  default: { name: 'default', ttl: 60_000, limit: 120 },
  /** Public unauthenticated endpoints (channel lookup) */
  public: { ttl: 60_000, limit: 30 },
  /** Expensive jobs: URL import, clip generation */
  expensive: { ttl: 60_000, limit: 10 },
  /** Auth profile sync */
  auth: { ttl: 60_000, limit: 30 },
  /** YouTube metrics refresh (external API quota) */
  analyticsRefresh: { ttl: 60_000, limit: 5 },
  /** Pipeline status polling during long-running jobs */
  polling: { ttl: 60_000, limit: 60 },
} as const;

/** Only register the default bucket globally; route-specific limits use @Throttle({ default: … }). */
export const throttlerModuleOptions = [
  {
    name: THROTTLE.default.name,
    ttl: THROTTLE.default.ttl,
    limit: THROTTLE.default.limit,
  },
];
