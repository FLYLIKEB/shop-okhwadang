import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';
import { AuditLogService } from '../../modules/audit-logs/audit-log.service';
import { redactSensitiveFields } from '../utils/redaction.util';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.get<{ action: string; resourceType: string; getResourceId?: (args: unknown[]) => number | null }>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!auditOptions) return next.handle();

    return next.handle().pipe(
      tap((responseBody) => {
        void this.logAction(context, auditOptions, responseBody, null);
      }),
      catchError((error) => {
        void this.logAction(context, auditOptions, null, error);
        throw error;
      }),
    );
  }

  private async logAction(
    context: ExecutionContext,
    options: { action: string; resourceType: string; getResourceId?: (args: unknown[]) => number | null },
    responseBody: unknown,
    error: Error | null,
  ): Promise<void> {
    try {
      const request = context.switchToHttp().getRequest<{
        user?: { id?: number; role?: string };
        body?: Record<string, unknown>;
        params?: Record<string, string>;
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
        connection?: { remoteAddress?: string };
      }>();
      const user = request.user;
      const actorId = user?.id ?? 0;
      const actorRole = user?.role ?? 'anonymous';

      const xForwardedFor = request.headers?.['x-forwarded-for'];
      const ip = typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')[0].trim()
        : request.ip ?? request.connection?.remoteAddress ?? null;
      const userAgent = request.headers?.['user-agent'] ?? null;

      const resourceId = request.params?.id ? parseInt(request.params.id, 10) || null : null;

      const beforeJson = error ? null : redactSensitiveFields(request.body ?? null);
      const afterJson = error
        ? null
        : redactSensitiveFields(this.extractResponseData(responseBody));

      await this.auditLogService.log({
        actorId,
        actorRole,
        action: options.action as never,
        resourceType: options.resourceType,
        resourceId,
        beforeJson,
        afterJson,
        ip,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  private extractResponseData(responseBody: unknown): Record<string, unknown> | null {
    if (!responseBody || typeof responseBody !== 'object') return null;
    const data = responseBody as Record<string, unknown>;
    return {
      id: data.id ?? null,
      status: data.status ?? null,
    };
  }
}