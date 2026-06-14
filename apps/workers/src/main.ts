import './instrumentation';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WorkersModule } from './workers.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkersModule);
  const config = app.get(ConfigService);
  const llmProvider = config.get<string>('llmProvider') ?? 'openai';
  const whisper = config.get<string>('openaiApiKey') ? 'OpenAI Whisper' : 'Whisper off (no OPENAI_API_KEY)';
  console.log(`AutoClipr workers started — transcription: ${whisper}, hooks: ${llmProvider}`);
  await app.init();
}

bootstrap();
