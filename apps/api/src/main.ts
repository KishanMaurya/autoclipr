import './instrumentation';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setDefaultResultOrder } from 'node:dns';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MonitoringService } from '@autoclipr/monitoring';

// Supabase direct DB hostnames are often IPv6-only
setDefaultResultOrder('ipv6first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const monitoring = app.get(MonitoringService);
  app.useGlobalFilters(new HttpExceptionFilter(monitoring));

  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Railway injects PORT — prefer it over API_PORT (local dev uses API_PORT=8080).
  const port = process.env.PORT ?? process.env.API_PORT ?? '8080';
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  monitoring.logInfo('AutoClipr API started', {
    port,
    nrEnabled: !!process.env.NEW_RELIC_LICENSE_KEY,
    appName: process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr API',
  });
}

bootstrap();
