import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MonitoringService } from '@autoclipr/monitoring';
import { CLIP_QUEUE } from '../jobs.constants';

const QUEUE_METRICS_INTERVAL_MS = 60_000;

@Injectable()
export class QueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectQueue(CLIP_QUEUE) private readonly clipQueue: Queue,
    private readonly monitoring: MonitoringService,
  ) {}

  onModuleInit(): void {
    void this.reportQueueMetrics();
    this.timer = setInterval(() => {
      void this.reportQueueMetrics();
    }, QUEUE_METRICS_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async reportQueueMetrics(): Promise<void> {
    try {
      const counts = await this.clipQueue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
      );

      const depth =
        (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);

      this.monitoring.recordMetric('Custom/AutoClipr/Queue/Depth', depth);
      this.monitoring.recordMetric(
        'Custom/AutoClipr/Queue/Failed',
        counts.failed ?? 0,
      );
      this.monitoring.recordMetric(
        'Custom/AutoClipr/Queue/Active',
        counts.active ?? 0,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.monitoring.logWarn('Failed to collect BullMQ queue metrics', {
        error: message,
      });
    }
  }
}
