import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : exception;

    // Capture the exception with Sentry
    Sentry.captureException(exception);

    response.status(status).json({Error:message});
  }
}
