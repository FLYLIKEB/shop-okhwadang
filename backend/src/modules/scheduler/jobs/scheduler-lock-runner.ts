import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

export class SchedulerLockRunner {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  async runWithLock(lockName: string, ttlMinutes: number, task: () => Promise<void>): Promise<void> {
    if (!(await this.acquireLock(lockName, ttlMinutes))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      await task();
    } catch (err) {
      this.logger.error(`[${lockName}] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  private async acquireLock(lockName: string, ttlMinutes: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    try {
      await this.dataSource.query(
        `INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           acquired_at = IF(expires_at <= NOW(), VALUES(acquired_at), acquired_at),
           expires_at = IF(expires_at <= NOW(), VALUES(expires_at), expires_at),
           instance_id = IF(expires_at <= NOW(), VALUES(instance_id), instance_id)`,
        [lockName, process.env.INSTANCE_ID || 'default', now, expiresAt],
      );

      const lock = await this.dataSource.query(
        `SELECT instance_id FROM scheduler_locks WHERE lock_name = ? AND expires_at > NOW()`,
        [lockName],
      );

      return lock.length > 0 && lock[0].instance_id === (process.env.INSTANCE_ID || 'default');
    } catch (err) {
      this.logger.error(`Failed to acquire lock ${lockName}: ${String(err)}`);
      return false;
    }
  }

  private async releaseLock(lockName: string): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM scheduler_locks WHERE lock_name = ? AND instance_id = ?`,
        [lockName, process.env.INSTANCE_ID || 'default'],
      );
    } catch (err) {
      this.logger.error(`Failed to release lock ${lockName}: ${String(err)}`);
    }
  }
}

