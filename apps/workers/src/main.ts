import './instrumentation';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '@autoclipr/monitoring';
import { WorkersModule } from './workers.module';
import { startHealthServer } from './health-server';

async function bootstrap() {
  // Respond to Railway healthchecks before BullMQ / DB init finishes.
  startHealthServer();

  const app = await NestFactory.createApplicationContext(WorkersModule);
  const config = app.get(ConfigService);
  const monitoring = app.get(MonitoringService);
  const llmProvider = config.get<string>('llmProvider') ?? 'openai';
  const whisper = config.get<string>('openaiApiKey')
    ? 'OpenAI Whisper'
    : 'Whisper off (no OPENAI_API_KEY)';

  await app.init();

  monitoring.logInfo('AutoClipr workers started', {
    llmProvider,
    whisper,
    nrEnabled: !!process.env.NEW_RELIC_LICENSE_KEY,
    appName: process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr Workers',
  });
}

bootstrap();
