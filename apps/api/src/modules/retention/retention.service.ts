import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from '@autoclipr/emails';
import { VideosService } from '../videos/videos.service';
import { RetentionRepository, RetentionVideo } from './retention.repository';

export interface RetentionSweepResult {
  dryRun: boolean;
  usersWarned: number;
  videosWarned: number;
  videosDeleted: number;
  deleteFailures: number;
  /** Populated on a dry run so an operator can see exactly who is affected. */
  preview?: {
    toWarn: { email: string; titles: string[] }[];
    toDelete: { email: string; title: string; warnedAt: string | null }[];
  };
}

/**
 * Starter-plan video retention.
 *
 * Videos generated on the free plan live for a fixed number of days, counted
 * from when each video was generated — so the window rolls per video rather
 * than expiring the whole account at once.
 *
 * The sweep is two-stage and nothing is deleted without notice:
 *
 *   warn    video is older than (starterVideoDays - grace) and unwarned
 *             → one email per user listing their affected videos
 *   delete  the warning is older than the grace period and the owner is
 *             still on a free tier
 *
 * Because deletion is gated on the warning stamp rather than on age alone, a
 * backlog of already-old videos gets warned on the first run and deleted a
 * grace period later, instead of vanishing the moment this ships.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly repo: RetentionRepository,
    private readonly email: EmailService,
    private readonly videos: VideosService,
    private readonly config: ConfigService,
  ) {}

  private cfg() {
    return {
      enabled: this.config.get<boolean>('retention.enabled') ?? false,
      days: this.config.get<number>('retention.starterVideoDays') ?? 3,
      graceHours: this.config.get<number>('retention.warningGraceHours') ?? 24,
      maxWarn: this.config.get<number>('retention.maxWarnPerRun') ?? 200,
      maxDelete: this.config.get<number>('retention.maxDeletePerRun') ?? 200,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'starter-video-retention' })
  async scheduledSweep(): Promise<void> {
    if (!this.cfg().enabled) {
      this.logger.debug('Retention sweep disabled (RETENTION_SWEEP_ENABLED != true)');
      return;
    }

    try {
      const result = await this.runSweep({ dryRun: false });
      this.logger.log(
        `Retention sweep: warned ${result.videosWarned} video(s) across ${result.usersWarned} user(s), deleted ${result.videosDeleted}, ${result.deleteFailures} failure(s)`,
      );
    } catch (err) {
      // Never let a sweep failure take the API process down.
      this.logger.error(
        `Retention sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async runSweep({ dryRun }: { dryRun: boolean }): Promise<RetentionSweepResult> {
    const { days, graceHours, maxWarn, maxDelete } = this.cfg();
    const now = Date.now();

    // Warn early enough that the grace period expires exactly at the
    // retention deadline: warn at (days - grace), delete grace hours later.
    const warnCutoff = new Date(now - Math.max(0, days * 86_400_000 - graceHours * 3_600_000));
    const deleteCutoff = new Date(now - graceHours * 3_600_000);

    const [toWarn, toDelete] = await Promise.all([
      this.repo.findVideosToWarn(warnCutoff, maxWarn),
      this.repo.findVideosToDelete(deleteCutoff, maxDelete),
    ]);

    if (dryRun) {
      const grouped = this.groupByUser(toWarn);
      return {
        dryRun: true,
        usersWarned: grouped.size,
        videosWarned: toWarn.length,
        videosDeleted: toDelete.length,
        deleteFailures: 0,
        preview: {
          toWarn: [...grouped.values()].map((videos) => ({
            email: videos[0].email,
            titles: videos.map((v) => v.title),
          })),
          toDelete: toDelete.map((v) => ({
            email: v.email,
            title: v.title,
            warnedAt: v.retention_warning_sent_at,
          })),
        },
      };
    }

    const warned = await this.sendWarnings(toWarn, days, graceHours);
    const deleted = await this.deleteExpired(toDelete);

    return {
      dryRun: false,
      usersWarned: warned.users,
      videosWarned: warned.videos,
      videosDeleted: deleted.ok,
      deleteFailures: deleted.failed,
    };
  }

  /** One email per user listing all of their affected videos, not one per video. */
  private async sendWarnings(
    videos: RetentionVideo[],
    days: number,
    graceHours: number,
  ): Promise<{ users: number; videos: number }> {
    const grouped = this.groupByUser(videos);
    let users = 0;
    let warnedVideos = 0;

    for (const userVideos of grouped.values()) {
      const first = userVideos[0];
      if (!first.email) {
        this.logger.warn(`Skipping retention warning for user ${first.user_id}: no email on profile`);
        continue;
      }

      // Each video's own deadline is `days` after it was generated, and the
      // batch is named by the earliest so the date is never later than the
      // first real deletion. Backlog videos are already past that deadline,
      // though, and quoting a date in the past would be nonsense — deletion
      // can't happen before the grace period elapses, so floor it there.
      const earliest = userVideos.reduce(
        (min, v) => (Date.parse(v.created_at) < Date.parse(min.created_at) ? v : min),
        first,
      );
      const deletionDate = new Date(
        Math.max(
          Date.parse(earliest.created_at) + days * 86_400_000,
          Date.now() + graceHours * 3_600_000,
        ),
      );

      const sent = await this.email.sendVideoRetentionWarning(first.email, {
        userName: first.full_name || first.email.split('@')[0],
        videoCount: userVideos.length,
        videoTitles: userVideos.slice(0, 10).map((v) => v.title),
        deletionDate: formatDate(deletionDate),
        upgradeUrl: '',
      });

      // Only stamp what actually went out — an unstamped video is simply
      // retried next run, whereas stamping a failed send would delete files
      // the user was never told about.
      if (!sent) continue;

      await this.repo.markWarned(
        userVideos.map((v) => v.id),
        new Date(),
      );
      users += 1;
      warnedVideos += userVideos.length;
    }

    return { users, videos: warnedVideos };
  }

  private async deleteExpired(videos: RetentionVideo[]): Promise<{ ok: number; failed: number }> {
    let ok = 0;
    let failed = 0;

    for (const video of videos) {
      try {
        // Reuses the normal delete path so storage objects, clips, and the
        // row all go the same way they do for a user-initiated delete.
        //
        // requireStorageRemoval keeps the row if Storage rejects the removal,
        // so the next sweep retries. Dropping the row anyway would leave the
        // file orphaned in the bucket after we'd emailed the owner to say it
        // was deleted.
        await this.videos.delete(video.user_id, video.id, {
          requireStorageRemoval: true,
          reason: 'retention',
        });
        ok += 1;
      } catch (err) {
        failed += 1;
        this.logger.error(
          `Retention delete failed for video ${video.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { ok, failed };
  }

  private groupByUser(videos: RetentionVideo[]): Map<string, RetentionVideo[]> {
    const grouped = new Map<string, RetentionVideo[]>();
    for (const video of videos) {
      const existing = grouped.get(video.user_id);
      if (existing) existing.push(video);
      else grouped.set(video.user_id, [video]);
    }
    return grouped;
  }

  /** Called when a user starts paying, so their pending warnings lapse. */
  async clearWarningsForUser(userId: string): Promise<void> {
    try {
      await this.repo.clearWarningsForUser(userId);
    } catch (err) {
      this.logger.error(
        `Failed clearing retention warnings for ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
