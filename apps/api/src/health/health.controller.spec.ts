import { HealthController } from './health.controller';

describe('HealthController', () => {
  const originalCommitSha = process.env.RAILWAY_GIT_COMMIT_SHA;

  afterEach(() => {
    if (originalCommitSha === undefined) {
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
    } else {
      process.env.RAILWAY_GIT_COMMIT_SHA = originalCommitSha;
    }
  });

  it('returns ok status with service/framework metadata', () => {
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    const controller = new HealthController();

    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('autoclipr-api');
    expect(result.framework).toBe('nestjs');
  });

  it('returns commit as null when RAILWAY_GIT_COMMIT_SHA is not set', () => {
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    const controller = new HealthController();

    expect(controller.check().commit).toBeNull();
  });

  it('returns the first 7 characters of RAILWAY_GIT_COMMIT_SHA when set', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'abcdef1234567890';
    const controller = new HealthController();

    expect(controller.check().commit).toBe('abcdef1');
  });

  it('returns the full sha when shorter than 7 characters', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'ab12';
    const controller = new HealthController();

    expect(controller.check().commit).toBe('ab12');
  });
});
