import {
  ArgumentsHost,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { redactSensitiveFields } from '../utils/redaction.util';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.withScope((scope) => {
      if (host.getType() === 'http') {
        const request = host.switchToHttp().getRequest<Record<string, unknown>>();
        const safeRequest = redactSensitiveFields({
          method: request?.method,
          url: request?.url,
          params: request?.params,
          query: request?.query,
          headers: request?.headers,
          body: request?.body,
          user: request?.user,
        });

        if (safeRequest) {
          scope.setContext('request', safeRequest);
        }
      }

      if (exception instanceof HttpException) {
        scope.setTag('http_status', String(exception.getStatus()));
      }

      Sentry.captureException(exception);
    });

    super.catch(exception, host);
  }
}
