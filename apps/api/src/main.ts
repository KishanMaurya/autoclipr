import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setDefaultResultOrder } from 'node:dns';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

// Supabase direct DB hostnames are often IPv6-only
setDefaultResultOrder('ipv6first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  console.log(`AutoClipr API (NestJS) listening on :${port}`);
}

bootstrap();
