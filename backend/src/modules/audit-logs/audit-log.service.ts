import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual, LessThan, MoreThanOrEqual } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { redactSensitiveFields } from '../../common/utils/redaction.util';

export interface AuditLogQuery {
  actorId?: number;
  actorRole?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: number;
  ip?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface CreateAuditLogDto {
  actorId: number;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: number | null;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  legalHold?: boolean;
  legalHoldReason?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      actorId: dto.actorId,
      actorRole: dto.actorRole,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId ?? null,
      beforeJson: redactSensitiveFields(dto.beforeJson ?? null),
      afterJson: redactSensitiveFields(dto.afterJson ?? null),
      ip: dto.ip ?? null,
      userAgent: dto.userAgent ?? null,
      legalHold: dto.legalHold ?? false,
      legalHoldReason: dto.legalHoldReason ?? null,
    });
    const saved = await this.auditLogRepository.save(entry);
    this.logger.log(`Audit log created: ${dto.action} by ${dto.actorId} on ${dto.resourceType}`);
    return saved;
  }

  async findAll(query: AuditLogQuery): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.actorRole) where.actorRole = query.actorRole;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.ip) where.ip = query.ip;

    let dateCondition: FindOptionsWhere<AuditLog> = {};
    if (query.startDate && query.endDate) {
      dateCondition = { createdAt: Between(query.startDate, query.endDate) } as FindOptionsWhere<AuditLog>;
    } else if (query.startDate) {
      dateCondition = { createdAt: MoreThanOrEqual(query.startDate) } as FindOptionsWhere<AuditLog>;
    } else if (query.endDate) {
      dateCondition = { createdAt: LessThanOrEqual(query.endDate) } as FindOptionsWhere<AuditLog>;
    }

    const finalWhere: FindOptionsWhere<AuditLog> = { ...where, ...dateCondition };

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: finalWhere,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findByResource(resourceType: string, resourceId: number): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByActor(actorId: number, page = 1, limit = 20): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { actorId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredLogsJob(): Promise<void> {
    const { deleted, cutoff } = await this.purgeExpiredLogs();
    this.logger.log(`Audit log retention cleanup completed: deleted=${deleted}, cutoff=${cutoff.toISOString()}`);
  }

  async purgeExpiredLogs(now = new Date()): Promise<{ deleted: number; cutoff: Date }> {
    const cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 3);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoff),
      legalHold: false,
    });

    return { deleted: result.affected ?? 0, cutoff };
  }
}
