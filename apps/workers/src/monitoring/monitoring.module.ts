import { Global, Module } from '@nestjs/common';
import { MonitoringService } from '@autoclipr/monitoring';

@Global()
@Module({
  providers: [
    {
      provide: MonitoringService,
      useFactory: () =>
        new MonitoringService(
          process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr Workers',
        ),
    },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
