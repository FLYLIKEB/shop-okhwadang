import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogRetentionPolicy1783600000000 implements MigrationInterface {
  name = 'AddAuditLogRetentionPolicy1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, 'legalHold', '`legalHold` tinyint NOT NULL DEFAULT 0');
    await this.addColumnIfMissing(queryRunner, 'legalHoldReason', '`legalHoldReason` varchar(500) NULL');
    await this.addIndexIfMissing(
      queryRunner,
      'IDX_audit_logs_retention_cleanup',
      'CREATE INDEX `IDX_audit_logs_retention_cleanup` ON `audit_logs` (`legalHold`, `createdAt`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(queryRunner, 'IDX_audit_logs_retention_cleanup');
    await this.dropColumnIfExists(queryRunner, 'legalHoldReason');
    await this.dropColumnIfExists(queryRunner, 'legalHold');
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, columnName: string, columnSql: string): Promise<void> {
    const [existing] = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = ?`,
      [columnName],
    )) as Array<{ COLUMN_NAME: string }>;
    if (!existing) {
      await queryRunner.query(`ALTER TABLE \`audit_logs\` ADD COLUMN ${columnSql}`);
    }
  }

  private async dropColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
    const [existing] = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = ?`,
      [columnName],
    )) as Array<{ COLUMN_NAME: string }>;
    if (existing) {
      await queryRunner.query(`ALTER TABLE \`audit_logs\` DROP COLUMN \`${columnName}\``);
    }
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, indexName: string, createSql: string): Promise<void> {
    const [existing] = (await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = ?`,
      [indexName],
    )) as Array<{ INDEX_NAME: string }>;
    if (!existing) {
      await queryRunner.query(createSql);
    }
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, indexName: string): Promise<void> {
    const [existing] = (await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = ?`,
      [indexName],
    )) as Array<{ INDEX_NAME: string }>;
    if (existing) {
      await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`audit_logs\``);
    }
  }
}
