import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournalEntriesTable1776300000000 implements MigrationInterface {
  name = 'CreateJournalEntriesTable1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`journal_entries\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`slug\` VARCHAR(200) NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`subtitle\` VARCHAR(300) NULL,
        \`category\` VARCHAR(50) NOT NULL,
        \`date\` VARCHAR(10) NOT NULL,
        \`read_time\` VARCHAR(20) NULL,
        \`summary\` TEXT NULL,
        \`content\` TEXT NULL,
        \`cover_image_url\` VARCHAR(500) NULL,
        \`is_published\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_journal_slug\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`journal_entries\``);
  }
}
