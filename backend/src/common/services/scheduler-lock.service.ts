import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const DEFAULT_INSTANCE_ID = 'default';

export interface SchedulerLockIdentityPolicy {
  instanceId?: string;
  fallbackInstanceId?: string;
}

export interface SchedulerLockAcquirePolicy extends SchedulerLockIdentityPolicy {
  lockName: string;
  ttlMinutes: number;
}

export interface SchedulerLockReleasePolicy extends SchedulerLockIdentityPolicy {
  lockName: string;
}

@Injectable()
export class SchedulerLockService {
  private readonly logger = new Logger(SchedulerLockService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async runWithLock(
    policy: SchedulerLockAcquirePolicy,
    task: () => Promise<void>,
  ): Promise<void> {
    const acquired = await this.acquireLock(policy);
    if (!acquired) {
      this.logger.debug(
        `[scheduler-lock] lock=${policy.lockName} action=skip reason=held-by-other-instance`,
      );
      return;
    }

    try {
      await task();
    } catch (err) {
      this.logger.error(
        `[scheduler-lock] lock=${policy.lockName} action=task-error error=${String(err)}`,
      );
    } finally {
      await this.releaseLock(policy);
    }
  }

  async acquireLock(policy: SchedulerLockAcquirePolicy): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.ttlMinutes * 60 * 1000);
    const instanceId = this.resolveInstanceId(policy);

    try {
      await this.dataSource.query(
        `INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           acquired_at = IF(expires_at <= NOW(), VALUES(acquired_at), acquired_at),
           expires_at = IF(expires_at <= NOW(), VALUES(expires_at), expires_at),
           instance_id = IF(expires_at <= NOW(), VALUES(instance_id), instance_id)`,
        [policy.lockName, instanceId, now, expiresAt],
      );

      const lock = await this.dataSource.query<Array<{ instance_id: string }>>(
        `SELECT instance_id FROM scheduler_locks WHERE lock_name = ? AND expires_at > NOW()`,
        [policy.lockName],
      );

      return lock.length > 0 && lock[0].instance_id === instanceId;
    } catch (err) {
      this.logger.error(
        `[scheduler-lock] lock=${policy.lockName} action=acquire-error error=${String(err)}`,
      );
      return false;
    }
  }

  async releaseLock(policy: SchedulerLockReleasePolicy): Promise<void> {
    const instanceId = this.resolveInstanceId(policy);

    try {
      await this.dataSource.query(
        `DELETE FROM scheduler_locks WHERE lock_name = ? AND instance_id = ?`,
        [policy.lockName, instanceId],
      );
    } catch (err) {
      this.logger.error(
        `[scheduler-lock] lock=${policy.lockName} action=release-error error=${String(err)}`,
      );
    }
  }

  private resolveInstanceId(policy: SchedulerLockIdentityPolicy): string {
    return policy.instanceId ?? process.env.INSTANCE_ID ?? policy.fallbackInstanceId ?? DEFAULT_INSTANCE_ID;
  }
}
