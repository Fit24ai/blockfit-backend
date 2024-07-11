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
      origin: ['https://app.fit24.live','http://localhost:3000',process.env.PUBLIC_URL,'https://fit24-cpy.vercel.app'],
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
