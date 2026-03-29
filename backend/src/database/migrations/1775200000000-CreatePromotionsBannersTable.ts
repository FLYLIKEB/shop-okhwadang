import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromotionsBannersTable1775200000000 implements MigrationInterface {
  name = 'CreatePromotionsBannersTable1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`promotions\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`description\` longtext NULL,
        \`type\` enum('timesale','exhibition','event') NOT NULL,
        \`starts_at\` datetime NOT NULL,
        \`ends_at\` datetime NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
        \`discount_rate\` int NULL,
        \`image_url\` varchar(500) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`banners\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`image_url\` varchar(500) NOT NULL,
        \`link_url\` varchar(500) NULL,
        \`sort_order\` int NOT NULL DEFAULT '0',
        \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
        \`starts_at\` datetime NULL,
        \`ends_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`banners\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`promotions\``);
  }
}
