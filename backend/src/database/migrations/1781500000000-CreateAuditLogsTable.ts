import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1781500000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [existing] = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'`,
    )) as Array<{ TABLE_NAME: string }>;
    if (existing) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`actorId\` INT NOT NULL,
        \`actorRole\` VARCHAR(50) NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`resourceType\` VARCHAR(100) NOT NULL,
        \`resourceId\` INT NULL,
        \`beforeJson\` JSON NULL,
        \`afterJson\` JSON NULL,
        \`ip\` VARCHAR(45) NULL,
        \`userAgent\` VARCHAR(500) NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_audit_logs_actorId_createdAt\` (\`actorId\`, \`createdAt\`),
        INDEX \`IDX_audit_logs_resourceType_resourceId\` (\`resourceType\`, \`resourceId\`),
        INDEX \`IDX_audit_logs_action_createdAt\` (\`action\`, \`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
  }
}
