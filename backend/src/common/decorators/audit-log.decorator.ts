import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../modules/audit-logs/entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';
export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditLogOptions {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (args: unknown[]) => number | null;
}

export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);