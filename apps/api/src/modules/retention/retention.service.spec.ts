import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@autoclipr/emails';
import { VideosService } from '../videos/videos.service';
import { RetentionRepository, RetentionVideo } from './retention.repository';
import { RetentionService } from './retention.service';

const DAY = 86_400_000;
const NOW = new Date('2026-08-31T12:00:00.000Z');

function video(overrides: Partial<RetentionVideo> = {}): RetentionVideo {
  return {
    id: 'v1',
    user_id: 'u1',
    title: 'My video',
    created_at: new Date(NOW.getTime() - 3 * DAY).toISOString(),
    retention_warning_sent_at: null,
    email: 'jane@example.com',
    full_name: 'Jane Doe',
    ...overrides,
  };
}

describe('RetentionService', () => {
  let service: RetentionService;
  let repo: jest.Mocked<RetentionRepository>;
  let email: jest.Mocked<EmailService>;
  let videos: jest.Mocked<VideosService>;
  let settings: Record<string, unknown>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    settings = {
      'retention.enabled': true,
      'retention.starterVideoDays': 3,
      'retention.warningGraceHours': 24,
      'retention.maxWarnPerRun': 200,
      'retention.maxDeletePerRun': 200,
    };

    repo = {
      findVideosToWarn: jest.fn().mockResolvedValue([]),
      findVideosToDelete: jest.fn().mockResolvedValue([]),
      markWarned: jest.fn().mockResolvedValue(undefined),
      clearWarningsForUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RetentionRepository>;

    email = {
      sendVideoRetentionWarning: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<EmailService>;

    videos = {
      delete: jest.fn().mockResolvedValue({ deleted: true }),
    } as unknown as jest.Mocked<VideosService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: RetentionRepository, useValue: repo },
        { provide: EmailService, useValue: email },
        { provide: VideosService, useValue: videos },
        { provide: ConfigService, useValue: { get: (k: string) => settings[k] } },
      ],
    }).compile();

    service = moduleRef.get(RetentionService);
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('cutoffs', () => {
    it('warns one grace period before the retention deadline', async () => {
      await service.runSweep({ dryRun: true });

      // 3 days retention minus 24h grace => warn videos older than 2 days.
      const [warnCutoff] = repo.findVideosToWarn.mock.calls[0];
      expect(warnCutoff.toISOString()).toBe(new Date(NOW.getTime() - 2 * DAY).toISOString());
    });

    it('deletes only warnings older than the grace period', async () => {
      await service.runSweep({ dryRun: true });

      const [deleteCutoff] = repo.findVideosToDelete.mock.calls[0];
      expect(deleteCutoff.toISOString()).toBe(new Date(NOW.getTime() - DAY).toISOString());
    });

    it('never warns about future videos when the grace exceeds the retention window', async () => {
      settings['retention.warningGraceHours'] = 24 * 10;

      await service.runSweep({ dryRun: true });

      // Clamped at now, rather than a cutoff in the future that would sweep
      // up videos generated seconds ago.
      const [warnCutoff] = repo.findVideosToWarn.mock.calls[0];
      expect(warnCutoff.getTime()).toBe(NOW.getTime());
    });

    it('passes the configured per-run caps through', async () => {
      settings['retention.maxWarnPerRun'] = 5;
      settings['retention.maxDeletePerRun'] = 7;

      await service.runSweep({ dryRun: true });

      expect(repo.findVideosToWarn).toHaveBeenCalledWith(expect.any(Date), 5);
      expect(repo.findVideosToDelete).toHaveBeenCalledWith(expect.any(Date), 7);
    });
  });

  describe('dry run', () => {
    it('reports what would happen without sending or deleting anything', async () => {
      repo.findVideosToWarn.mockResolvedValue([
        video({ id: 'v1', title: 'One' }),
        video({ id: 'v2', title: 'Two' }),
      ]);
      repo.findVideosToDelete.mockResolvedValue([
        video({ id: 'v3', title: 'Three', retention_warning_sent_at: '2026-08-29T00:00:00.000Z' }),
      ]);

      const result = await service.runSweep({ dryRun: true });

      expect(email.sendVideoRetentionWarning).not.toHaveBeenCalled();
      expect(videos.delete).not.toHaveBeenCalled();
      expect(repo.markWarned).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        dryRun: true,
        usersWarned: 1,
        videosWarned: 2,
        videosDeleted: 1,
        deleteFailures: 0,
      });
      expect(result.preview?.toWarn).toEqual([
        { email: 'jane@example.com', titles: ['One', 'Two'] },
      ]);
      expect(result.preview?.toDelete).toEqual([
        { email: 'jane@example.com', title: 'Three', warnedAt: '2026-08-29T00:00:00.000Z' },
      ]);
    });
  });

  describe('warnings', () => {
    it('sends one email per user covering all of their videos', async () => {
      repo.findVideosToWarn.mockResolvedValue([
        video({ id: 'v1', user_id: 'u1', title: 'One' }),
        video({ id: 'v2', user_id: 'u1', title: 'Two' }),
        video({ id: 'v3', user_id: 'u2', title: 'Three', email: 'bob@example.com', full_name: 'Bob' }),
      ]);

      const result = await service.runSweep({ dryRun: false });

      expect(email.sendVideoRetentionWarning).toHaveBeenCalledTimes(2);
      expect(email.sendVideoRetentionWarning).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ videoCount: 2, videoTitles: ['One', 'Two'] }),
      );
      expect(result.usersWarned).toBe(2);
      expect(result.videosWarned).toBe(3);
    });

    it('dates the notice from the oldest video in the batch', async () => {
      repo.findVideosToWarn.mockResolvedValue([
        // Created 2 days ago — its 3-day deadline is 1 September.
        video({ id: 'v1', created_at: new Date(NOW.getTime() - DAY).toISOString() }),
        video({ id: 'v2', created_at: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
      ]);

      await service.runSweep({ dryRun: false });

      expect(email.sendVideoRetentionWarning).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ deletionDate: '1 September 2026' }),
      );
    });

    it('never quotes a deadline in the past for backlog videos', async () => {
      // A 40-day-old video is long past created_at + 3 days, but it still
      // cannot be deleted until the grace period after this warning.
      repo.findVideosToWarn.mockResolvedValue([
        video({ created_at: new Date(NOW.getTime() - 40 * DAY).toISOString() }),
      ]);

      await service.runSweep({ dryRun: false });

      expect(email.sendVideoRetentionWarning).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ deletionDate: '1 September 2026' }),
      );
    });

    it('stamps the videos only after the email actually goes out', async () => {
      repo.findVideosToWarn.mockResolvedValue([video({ id: 'v1' }), video({ id: 'v2' })]);

      await service.runSweep({ dryRun: false });

      expect(repo.markWarned).toHaveBeenCalledWith(['v1', 'v2'], NOW);
    });

    it('does not stamp — and so retries next run — when the email fails', async () => {
      email.sendVideoRetentionWarning.mockResolvedValue(false);
      repo.findVideosToWarn.mockResolvedValue([video()]);

      const result = await service.runSweep({ dryRun: false });

      // The whole point: an unstamped video is never eligible for deletion,
      // so a failed send can't lead to silent data loss.
      expect(repo.markWarned).not.toHaveBeenCalled();
      expect(result.usersWarned).toBe(0);
      expect(result.videosWarned).toBe(0);
    });

    it('skips a profile with no email address', async () => {
      repo.findVideosToWarn.mockResolvedValue([video({ email: '' })]);

      const result = await service.runSweep({ dryRun: false });

      expect(email.sendVideoRetentionWarning).not.toHaveBeenCalled();
      expect(repo.markWarned).not.toHaveBeenCalled();
      expect(result.usersWarned).toBe(0);
    });

    it('falls back to the email local-part when the profile has no name', async () => {
      repo.findVideosToWarn.mockResolvedValue([video({ full_name: null })]);

      await service.runSweep({ dryRun: false });

      expect(email.sendVideoRetentionWarning).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ userName: 'jane' }),
      );
    });

    it('caps the listed titles but still counts every video', async () => {
      repo.findVideosToWarn.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => video({ id: `v${i}`, title: `Video ${i}` })),
      );

      await service.runSweep({ dryRun: false });

      const vars = email.sendVideoRetentionWarning.mock.calls[0][1];
      expect(vars.videoTitles).toHaveLength(10);
      expect(vars.videoCount).toBe(12);
    });
  });

  describe('deletion', () => {
    it('deletes through the normal video delete path, scoped to the owner', async () => {
      repo.findVideosToDelete.mockResolvedValue([
        video({ id: 'v1', user_id: 'u1' }),
        video({ id: 'v2', user_id: 'u2' }),
      ]);

      const result = await service.runSweep({ dryRun: false });

      // requireStorageRemoval is what stops a row being dropped while its
      // file survives in the bucket.
      // reason tags the row in video_deletions so the admin panel can split
      // sweep deletions from ones users did themselves.
      expect(videos.delete).toHaveBeenCalledWith('u1', 'v1', {
        requireStorageRemoval: true,
        reason: 'retention',
      });
      expect(videos.delete).toHaveBeenCalledWith('u2', 'v2', {
        requireStorageRemoval: true,
        reason: 'retention',
      });
      expect(result.videosDeleted).toBe(2);
      expect(result.deleteFailures).toBe(0);
    });

    it('counts a storage-removal failure as a failure, leaving the row to retry', async () => {
      repo.findVideosToDelete.mockResolvedValue([video({ id: 'v1' })]);
      // What videos.delete() throws when requireStorageRemoval is set and
      // Supabase Storage rejected the removal.
      videos.delete.mockRejectedValue(
        new Error('Storage removal failed for video v1; keeping the row so it can be retried'),
      );

      const result = await service.runSweep({ dryRun: false });

      expect(result.videosDeleted).toBe(0);
      expect(result.deleteFailures).toBe(1);
    });

    it('keeps going and counts failures when one delete throws', async () => {
      repo.findVideosToDelete.mockResolvedValue([
        video({ id: 'v1' }),
        video({ id: 'v2' }),
        video({ id: 'v3' }),
      ]);
      videos.delete.mockRejectedValueOnce(new Error('storage down'));

      const result = await service.runSweep({ dryRun: false });

      expect(videos.delete).toHaveBeenCalledTimes(3);
      expect(result.videosDeleted).toBe(2);
      expect(result.deleteFailures).toBe(1);
    });
  });

  describe('scheduledSweep', () => {
    it('does nothing while the sweep is disabled', async () => {
      settings['retention.enabled'] = false;

      await service.scheduledSweep();

      expect(repo.findVideosToWarn).not.toHaveBeenCalled();
      expect(videos.delete).not.toHaveBeenCalled();
    });

    it('runs a real sweep when enabled', async () => {
      repo.findVideosToWarn.mockResolvedValue([video()]);

      await service.scheduledSweep();

      expect(email.sendVideoRetentionWarning).toHaveBeenCalled();
    });

    it('swallows sweep failures so the scheduler keeps running', async () => {
      repo.findVideosToWarn.mockRejectedValue(new Error('db unreachable'));

      await expect(service.scheduledSweep()).resolves.toBeUndefined();
      expect(service['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('db unreachable'),
      );
    });

    it('logs a non-Error rejection without crashing', async () => {
      repo.findVideosToWarn.mockRejectedValue('plain string');

      await expect(service.scheduledSweep()).resolves.toBeUndefined();
      expect(service['logger'].error).toHaveBeenCalledWith(expect.stringContaining('plain string'));
    });
  });

  describe('clearWarningsForUser', () => {
    it('delegates to the repository', async () => {
      await service.clearWarningsForUser('u1');

      expect(repo.clearWarningsForUser).toHaveBeenCalledWith('u1');
    });

    it('never throws — an upgrade must not fail because of this', async () => {
      repo.clearWarningsForUser.mockRejectedValue(new Error('write failed'));

      await expect(service.clearWarningsForUser('u1')).resolves.toBeUndefined();
      expect(service['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('write failed'),
      );
    });

    it('logs a non-Error rejection', async () => {
      repo.clearWarningsForUser.mockRejectedValue('nope');

      await expect(service.clearWarningsForUser('u1')).resolves.toBeUndefined();
      expect(service['logger'].error).toHaveBeenCalledWith(expect.stringContaining('nope'));
    });
  });

  describe('config defaults', () => {
    it('falls back to safe defaults when nothing is configured', async () => {
      settings = {};

      await service.runSweep({ dryRun: true });

      expect(repo.findVideosToWarn).toHaveBeenCalledWith(
        new Date(NOW.getTime() - 2 * DAY),
        200,
      );
    });

    it('treats a missing enabled flag as disabled', async () => {
      settings = {};

      await service.scheduledSweep();

      expect(repo.findVideosToWarn).not.toHaveBeenCalled();
    });
  });
});
