import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementBarsTable1782700000000 implements MigrationInterface {
  name = 'CreateAnnouncementBarsTable1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`announcement_bars\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`message\` varchar(255) NOT NULL,
        \`message_en\` varchar(255) NULL,
        \`href\` varchar(255) NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_announcement_bars_sort_order\` (\`sort_order\`),
        INDEX \`IDX_announcement_bars_is_active\` (\`is_active\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE \`announcement_bars\`');
  }
}
