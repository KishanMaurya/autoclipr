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
  },
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  clipCreditCost: parseInt(process.env.CLIP_CREDIT_COST ?? '1', 10),
  webAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  apiPublicUrl:
    process.env.API_PUBLIC_URL ??
    `http://localhost:${process.env.API_PORT ?? process.env.PORT ?? '8080'}`,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? '',
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
