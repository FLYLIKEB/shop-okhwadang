import { Injectable, Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
      ip: this.clientIpOf(req),
      ids: this.extractUsefulIds(req),
      body: this.sanitizeAndTruncate(req.body),
      ...(error ? { error: this.errorSummary(error) } : {}),
    };
  }

  private clientIpOf(req: RequestForLogging): string | null {
    return (
      this.headerValue(req.headers, 'cf-connecting-ip') ??
      this.firstForwardedIp(this.rawHeaderValue(req.headers, 'x-forwarded-for')) ??
      this.headerValue(req.headers, 'x-real-ip') ??
      this.cleanIp(req.ip) ??
      this.cleanIp(req.socket?.remoteAddress) ??
      null
    );
  }

  private rawHeaderValue(
    headers: RequestForLogging['headers'],
    name: string,
  ): string | string[] | undefined {
    if (!headers) return undefined;
    const direct = headers[name] ?? headers[name.toLowerCase()];
    if (direct !== undefined) return direct;

    const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
    return found?.[1];
  }

  private headerValue(headers: RequestForLogging['headers'], name: string): string | null {
    const raw = this.rawHeaderValue(headers, name);
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      const cleaned = this.cleanIp(value);
      if (cleaned) return cleaned;
    }
    return null;
  }

  private firstForwardedIp(value: string | string[] | undefined): string | null {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      const first = item?.split(',')[0];
      const cleaned = this.cleanIp(first);
      if (cleaned) return cleaned;
    }
    return null;
  }

  private cleanIp(value: string | undefined): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
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
