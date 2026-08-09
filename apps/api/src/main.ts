import './instrumentation';
// v2
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Swagger is dev/staging only — this is a private API with no third-party
  // consumers, so there's no reason to expose the full endpoint/schema
  // surface publicly in production.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AutoClipr API')
      .setDescription('REST API for AutoClipr — AI video clipping SaaS')
      .setVersion(process.env.npm_package_version ?? '0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Railway healthchecks probe from outside the container — must bind 0.0.0.0.
  const port = process.env.PORT ?? process.env.API_PORT ?? '8080';
  await app.listen(port, '0.0.0.0');
  monitoring.logInfo('AutoClipr API started', {
    port,
    nrEnabled: !!process.env.NEW_RELIC_LICENSE_KEY,
    appName: process.env.NEW_RELIC_APP_NAME ?? 'AutoClipr API',
  });
}

bootstrap();
