import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuditAction } from '../../audit-logs/entities/audit-log.entity';

interface LoginFailureMeta {
  email: string;
  reason: string;
  attempts?: number;
  lockedUntil?: Date;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthAuditService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async logUserNotFound(email: string, ip?: string | null, userAgent?: string | null): Promise<void> {
    await this.auditLogService.log({
      actorId: 0,
      actorRole: 'anonymous',
      action: AuditAction.LOGIN_FAILURE,
      resourceType: 'auth',
      beforeJson: { email },
      afterJson: { reason: 'user_not_found' },
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }

  async logLoginFailure(user: User, meta: LoginFailureMeta): Promise<void> {
    await this.auditLogService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.LOGIN_FAILURE,
      resourceType: 'auth',
      beforeJson: { email: meta.email },
      afterJson: {
        reason: meta.reason,
        ...(meta.attempts !== undefined ? { attempts: meta.attempts } : {}),
        ...(meta.lockedUntil ? { lockedUntil: meta.lockedUntil.toISOString() } : {}),
      },
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });
  }

  async logLoginSuccess(
    user: User,
    email: string,
    ip?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    await this.auditLogService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.LOGIN_SUCCESS,
      resourceType: 'auth',
      beforeJson: { email },
      afterJson: { userId: user.id },
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

