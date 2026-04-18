import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointHistoryExpiresAt1781000000000 implements MigrationInterface {
  name = 'AddPointHistoryExpiresAt1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`point_history\` ADD \`expires_at\` datetime NULL AFTER \`description\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_point_history_expires_at\` ON \`point_history\` (\`expires_at\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_point_history_expires_at\` ON \`point_history\``);
    await queryRunner.query(`ALTER TABLE \`point_history\` DROP COLUMN \`expires_at\``);
  }
}