import configuration from './configuration';

describe('configuration', () => {
  const ENV_KEYS = [
    'API_PORT',
    'PORT',
    'API_HOST',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'JWT_SECRET',
    'STORAGE_BUCKET_VIDEOS',
    'STORAGE_BUCKET_CLIPS',
    'STORAGE_BUCKET_EXPORTS',
    'STORAGE_BUCKET_AVATARS',
    'REDIS_URL',
    'CLIP_CREDIT_COST',
    'WEB_APP_URL',
    'NEXT_PUBLIC_APP_URL',
    'API_PUBLIC_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'META_APP_ID',
    'META_APP_SECRET',
    'META_REDIRECT_URI',
  ];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('falls back to documented defaults when nothing is set', () => {
    const config = configuration();

    expect(config.port).toBe(8080);
    expect(config.host).toBe('0.0.0.0');
    expect(config.databaseUrl).toBe('');
    expect(config.supabaseUrl).toBe('');
    expect(config.supabaseServiceKey).toBe('');
    expect(config.supabaseJwtSecret).toBe('');
    expect(config.buckets).toEqual({
      videos: 'videos',
      clips: 'clips',
      exports: 'exports',
      avatars: 'avatars',
    });
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.clipCreditCost).toBe(1);
    expect(config.webAppUrl).toBe('http://localhost:3000');
    expect(config.apiPublicUrl).toBe('http://localhost:8080');
    expect(config.googleClientId).toBe('');
    expect(config.googleClientSecret).toBe('');
    expect(config.googleRedirectUri).toBe('');
    expect(config.metaAppId).toBe('');
    expect(config.metaAppSecret).toBe('');
    expect(config.metaRedirectUri).toBe('');
    expect(config.jwtSecret).toBe('');
  });

  it('uses every provided environment variable over its default', () => {
    process.env.API_PORT = '9090';
    process.env.API_HOST = '127.0.0.1';
    process.env.DATABASE_URL = 'postgres://u:p@host:5432/db';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret';
    process.env.STORAGE_BUCKET_VIDEOS = 'custom-videos';
    process.env.STORAGE_BUCKET_CLIPS = 'custom-clips';
    process.env.STORAGE_BUCKET_EXPORTS = 'custom-exports';
    process.env.STORAGE_BUCKET_AVATARS = 'custom-avatars';
    process.env.REDIS_URL = 'redis://redis.internal:6380';
    process.env.CLIP_CREDIT_COST = '5';
    process.env.WEB_APP_URL = 'https://autoclipr.com';
    process.env.API_PUBLIC_URL = 'https://api.autoclipr.com';
    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://autoclipr.com/oauth/google';
    process.env.META_APP_ID = 'meta-id';
    process.env.META_APP_SECRET = 'meta-secret';
    process.env.META_REDIRECT_URI = 'https://autoclipr.com/oauth/meta';

    const config = configuration();

    expect(config.port).toBe(9090);
    expect(config.host).toBe('127.0.0.1');
    expect(config.databaseUrl).toBe('postgres://u:p@host:5432/db');
    expect(config.supabaseUrl).toBe('https://project.supabase.co');
    expect(config.supabaseServiceKey).toBe('service-key');
    expect(config.supabaseJwtSecret).toBe('jwt-secret');
    expect(config.buckets).toEqual({
      videos: 'custom-videos',
      clips: 'custom-clips',
      exports: 'custom-exports',
      avatars: 'custom-avatars',
    });
    expect(config.redisUrl).toBe('redis://redis.internal:6380');
    expect(config.clipCreditCost).toBe(5);
    expect(config.webAppUrl).toBe('https://autoclipr.com');
    expect(config.apiPublicUrl).toBe('https://api.autoclipr.com');
    expect(config.googleClientId).toBe('google-id');
    expect(config.googleClientSecret).toBe('google-secret');
    expect(config.googleRedirectUri).toBe('https://autoclipr.com/oauth/google');
    expect(config.metaAppId).toBe('meta-id');
    expect(config.metaAppSecret).toBe('meta-secret');
    expect(config.metaRedirectUri).toBe('https://autoclipr.com/oauth/meta');
  });

  it('falls back port to PORT when API_PORT is unset', () => {
    process.env.PORT = '3333';
    expect(configuration().port).toBe(3333);
  });

  it('prefers API_PORT over PORT when both are set', () => {
    process.env.API_PORT = '4000';
    process.env.PORT = '3333';
    expect(configuration().port).toBe(4000);
  });

  it('falls back webAppUrl to NEXT_PUBLIC_APP_URL when WEB_APP_URL is unset', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.autoclipr.com';
    expect(configuration().webAppUrl).toBe('https://staging.autoclipr.com');
  });

  it('falls back supabaseJwtSecret to JWT_SECRET when SUPABASE_JWT_SECRET is unset', () => {
    process.env.JWT_SECRET = 'shared-secret';
    expect(configuration().supabaseJwtSecret).toBe('shared-secret');
    expect(configuration().jwtSecret).toBe('shared-secret');
  });

  it('prefers SUPABASE_JWT_SECRET over JWT_SECRET for supabaseJwtSecret, but jwtSecret prefers JWT_SECRET', () => {
    process.env.SUPABASE_JWT_SECRET = 'supabase-secret';
    process.env.JWT_SECRET = 'jwt-secret';

    const config = configuration();

    expect(config.supabaseJwtSecret).toBe('supabase-secret');
    expect(config.jwtSecret).toBe('jwt-secret');
  });

  it('derives apiPublicUrl port from PORT when API_PORT/API_PUBLIC_URL are unset', () => {
    process.env.PORT = '6000';
    expect(configuration().apiPublicUrl).toBe('http://localhost:6000');
  });

  describe('normalizeDatabaseUrl (via databaseUrl)', () => {
    it('returns empty string when DATABASE_URL is unset', () => {
      expect(configuration().databaseUrl).toBe('');
    });

    it('passes through a normal connection string unchanged', () => {
      process.env.DATABASE_URL = 'postgres://u:p@host:5432/db';
      expect(configuration().databaseUrl).toBe('postgres://u:p@host:5432/db');
    });

    it('trims surrounding whitespace', () => {
      process.env.DATABASE_URL = '  postgres://u:p@host:5432/db  ';
      expect(configuration().databaseUrl).toBe('postgres://u:p@host:5432/db');
    });

    it('strips an accidental single "DATABASE_URL=" prefix', () => {
      process.env.DATABASE_URL = 'DATABASE_URL=postgres://u:p@host:5432/db';
      expect(configuration().databaseUrl).toBe('postgres://u:p@host:5432/db');
    });

    it('strips a repeated "DATABASE_URL=" prefix', () => {
      process.env.DATABASE_URL = 'DATABASE_URL=DATABASE_URL=postgres://u:p@host:5432/db';
      expect(configuration().databaseUrl).toBe('postgres://u:p@host:5432/db');
    });
  });
});
