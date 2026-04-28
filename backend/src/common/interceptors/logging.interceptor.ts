import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'credit_card',
  'cvv',
  'cardnumber',
  'accountnumber',
  'bankaccount',
  'cardno',
  'refreshtoken',
  'secret',
  'ssn',
  'phone',
  'address',
  'email',
];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      body: Record<string, unknown>;
    }>();
    const { method, url, body } = req;
    const sanitizedBody = this.sanitize(body);
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${method} ${url} ${Date.now() - start}ms body=${JSON.stringify(sanitizedBody)}`,
        );
      }),
    );
  }

  private sanitize(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return obj;
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) =>
        SENSITIVE_FIELDS.some((f) => k.toLowerCase().includes(f))
          ? [k, '[REDACTED]']
          : [k, typeof v === 'object' && v !== null ? this.sanitize(v as Record<string, unknown>) : v],
      ),
    );
  }
}
