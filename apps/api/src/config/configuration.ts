export default () => ({
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? '8080', 10),
  host: process.env.API_HOST ?? '0.0.0.0',
  databaseUrl: normalizeDatabaseUrl(process.env.DATABASE_URL),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? process.env.JWT_SECRET ?? '',
  buckets: {
    videos: process.env.STORAGE_BUCKET_VIDEOS ?? 'videos',
    clips: process.env.STORAGE_BUCKET_CLIPS ?? 'clips',
    exports: process.env.STORAGE_BUCKET_EXPORTS ?? 'exports',
    avatars: process.env.STORAGE_BUCKET_AVATARS ?? 'avatars',
  },
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  clipCreditCost: parseInt(process.env.CLIP_CREDIT_COST ?? '1', 10),
  webAppUrl:
    process.env.WEB_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000',
  apiPublicUrl:
    process.env.API_PUBLIC_URL ??
    `http://localhost:${process.env.API_PORT ?? process.env.PORT ?? '8080'}`,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
  metaAppId: process.env.META_APP_ID ?? '',
  metaAppSecret: process.env.META_APP_SECRET ?? '',
  metaRedirectUri: process.env.META_REDIRECT_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? '',
  campaigns: {
    // Off by default: this emails real customers in bulk. Preview it first,
    // then set CAMPAIGN_SATURDAY_ENABLED=true.
    saturdayEnabled: process.env.CAMPAIGN_SATURDAY_ENABLED === 'true',
    // Users are walked in pages rather than loaded whole.
    batchSize: parseInt(process.env.CAMPAIGN_BATCH_SIZE ?? '500', 10),
    // Ceiling per run, so a first run over a large user base cannot fire
    // unlimited email in one go.
    maxPerRun: parseInt(process.env.CAMPAIGN_MAX_PER_RUN ?? '5000', 10),
    // Hard limit on emails per calendar day, matching the provider's quota.
    // Resend's free tier allows 100/day; exceeding it does not queue, it
    // simply stops delivering. One wave therefore spreads across Fri-Mon.
    dailyCap: parseInt(process.env.CAMPAIGN_DAILY_CAP ?? '100', 10),
  },
  retention: {
    // Off by default. The sweep emails real customers and permanently deletes
    // their files, so arming it is a deliberate act, not a side effect of a
    // deploy. Flip RETENTION_SWEEP_ENABLED=true once a dry run looks right.
    enabled: process.env.RETENTION_SWEEP_ENABLED === 'true',
    // How long a Starter-plan video lives, counted from when it was generated.
    starterVideoDays: parseInt(process.env.RETENTION_STARTER_DAYS ?? '3', 10),
    // Gap between the warning email and the deletion. Also decides how early
    // the warning goes out: at (starterVideoDays - this).
    warningGraceHours: parseInt(process.env.RETENTION_WARNING_GRACE_HOURS ?? '24', 10),
    // Per-run ceilings, so a first run over a large backlog can't fire
    // thousands of emails or deletions in one go.
    maxWarnPerRun: parseInt(process.env.RETENTION_MAX_WARN_PER_RUN ?? '200', 10),
    maxDeletePerRun: parseInt(process.env.RETENTION_MAX_DELETE_PER_RUN ?? '200', 10),
  },
});

/** Strip accidental "DATABASE_URL=" prefix and trim (common .env typo). */
function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let url = raw.trim();
  while (url.startsWith('DATABASE_URL=')) {
    url = url.slice('DATABASE_URL='.length).trim();
  }
  return url;
}
