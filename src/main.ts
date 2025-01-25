import './instrument';

import * as Sentry from '@sentry/nestjs';
import {
  BaseExceptionFilter,
  HttpAdapterHost,
  NestFactory,
} from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SentryExceptionFilter } from './utils/sentry-exception-handler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [
        'https://fit24.expert',
        'https://fit24-admin.vercel.app',
        'http://localhost:3000',
        'http://192.168.1.2:3000',
      ],
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Fit24 API Reference')
    .setDescription('Fit24 API Reference')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const { httpAdapter } = app.get(HttpAdapterHost);
  Sentry.setupNestErrorHandler(app, new BaseExceptionFilter(httpAdapter));

  app.useGlobalFilters(new SentryExceptionFilter());

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT);
}
bootstrap();
