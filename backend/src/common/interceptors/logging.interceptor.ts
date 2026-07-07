import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { redactSensitiveFields } from '../utils/redaction.util';
import { updateRequestLogContext } from '../logging/request-context';

const MAX_BODY_LOG_LENGTH = 4000;

type RequestForLogging = {
  method: string;
  originalUrl?: string;
  url: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: number | string; role?: string };
};

type ResponseForLogging = {
  statusCode?: number;
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestForLogging>();
    const res = context.switchToHttp().getResponse<ResponseForLogging>();
    const start = Date.now();

    this.attachUserContext(req);

    return next.handle().pipe(
      tap(() => {
        this.logger.log(this.buildPayload(req, res, start, 'completed'));
      }),
      catchError((error: unknown) => {
        this.logger.error(
          this.buildPayload(req, res, start, 'failed', error),
          error instanceof Error ? error.stack : undefined,
        );
        return throwError(() => error);
      }),
    );
  }

  private attachUserContext(req: RequestForLogging): void {
    const userId = req.user?.id ?? null;
    updateRequestLogContext({
      userId,
      memberId: userId,
      role: req.user?.role ?? null,
    });
  }

  private buildPayload(
    req: RequestForLogging,
    res: ResponseForLogging,
    start: number,
    event: 'completed' | 'failed',
    error?: unknown,
  ): Record<string, unknown> {
    return {
      event: 'http_request',
      outcome: event,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: this.statusCodeOf(res, error),
      durationMs: Date.now() - start,
      ip: req.ip ?? req.socket?.remoteAddress ?? null,
      ids: this.extractUsefulIds(req),
      body: this.sanitizeAndTruncate(req.body),
      ...(error ? { error: this.errorSummary(error) } : {}),
    };
  }

  private statusCodeOf(res: ResponseForLogging, error?: unknown): number | undefined {
    if (res.statusCode) return res.statusCode;
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: unknown }).status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }

  private extractUsefulIds(req: RequestForLogging): Record<string, unknown> {
    const source = {
      ...(req.params ?? {}),
      ...(req.query ?? {}),
      ...(req.body ?? {}),
    };
    const keys = [
      'id',
      'userId',
      'memberId',
      'orderId',
      'orderNo',
      'paymentId',
      'paymentKey',
      'transactionId',
      'transaction_id',
      'refundId',
      'productId',
      'cartItemId',
    ];

    return Object.fromEntries(
      keys
        .filter((key) => source[key] !== undefined && source[key] !== null && source[key] !== '')
        .map((key) => [key, source[key]]),
    );
  }

  private sanitizeAndTruncate(body: Record<string, unknown> | undefined): unknown {
    const sanitized = redactSensitiveFields(body);
    if (!sanitized) return null;

    const serialized = JSON.stringify(sanitized);
    if (serialized.length <= MAX_BODY_LOG_LENGTH) return sanitized;

    return {
      truncated: true,
      length: serialized.length,
      preview: serialized.slice(0, MAX_BODY_LOG_LENGTH),
    };
  }

  private errorSummary(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }
    return { message: String(error) };
  }
}
