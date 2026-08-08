import { shouldLogHttpBodies } from './http-log.util';

describe('shouldLogHttpBodies', () => {
  const originalFlag = process.env.LOG_HTTP_BODIES;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.LOG_HTTP_BODIES;
    } else {
      process.env.LOG_HTTP_BODIES = originalFlag;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('returns true when LOG_HTTP_BODIES is "true"', () => {
    process.env.LOG_HTTP_BODIES = 'true';
    expect(shouldLogHttpBodies()).toBe(true);
  });

  it('is case-insensitive and trims whitespace when checking for "true"', () => {
    process.env.LOG_HTTP_BODIES = '  TRUE  ';
    expect(shouldLogHttpBodies()).toBe(true);
  });

  it('returns false when LOG_HTTP_BODIES is "false", regardless of NODE_ENV', () => {
    process.env.LOG_HTTP_BODIES = 'false';
    process.env.NODE_ENV = 'development';
    expect(shouldLogHttpBodies()).toBe(false);
  });

  it('is case-insensitive and trims whitespace when checking for "false"', () => {
    process.env.LOG_HTTP_BODIES = '  FALSE  ';
    process.env.NODE_ENV = 'development';
    expect(shouldLogHttpBodies()).toBe(false);
  });

  it('falls back to NODE_ENV when LOG_HTTP_BODIES is unset: false in production', () => {
    delete process.env.LOG_HTTP_BODIES;
    process.env.NODE_ENV = 'production';
    expect(shouldLogHttpBodies()).toBe(false);
  });

  it('falls back to NODE_ENV when LOG_HTTP_BODIES is unset: true outside production', () => {
    delete process.env.LOG_HTTP_BODIES;
    process.env.NODE_ENV = 'development';
    expect(shouldLogHttpBodies()).toBe(true);
  });

  it('falls back to NODE_ENV when LOG_HTTP_BODIES is an unrecognized value', () => {
    process.env.LOG_HTTP_BODIES = 'yes';
    process.env.NODE_ENV = 'production';
    expect(shouldLogHttpBodies()).toBe(false);
  });

  it('treats a missing NODE_ENV as non-production (true)', () => {
    delete process.env.LOG_HTTP_BODIES;
    delete process.env.NODE_ENV;
    expect(shouldLogHttpBodies()).toBe(true);
  });
});
