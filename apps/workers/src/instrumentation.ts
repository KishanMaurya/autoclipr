import { loadNewRelic, MonitoringService, structuredLog } from '@autoclipr/monitoring';

loadNewRelic();

const monitoring = new MonitoringService(
  process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr Workers',
);

process.on('unhandledRejection', (reason) => {
  const error =
    reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled rejection'));
  monitoring.noticeError(error, { source: 'unhandledRejection' });
});

process.on('uncaughtException', (error) => {
  monitoring.noticeError(error, { source: 'uncaughtException' });
  structuredLog('error', error.message, {
    service: process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr Workers',
    source: 'uncaughtException',
  }, error);
});
