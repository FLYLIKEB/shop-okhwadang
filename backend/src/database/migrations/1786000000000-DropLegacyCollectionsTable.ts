import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyCollectionsTable1786000000000 implements MigrationInterface {
  name = 'DropLegacyCollectionsTable1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `collections`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id bigint NOT NULL AUTO_INCREMENT,
        type varchar(20) NOT NULL,
        name varchar(100) NOT NULL,
        nameKo varchar(100) NULL,
        name_en varchar(100) NULL,
        description text NULL,
        description_en text NULL,
        color varchar(20) NULL,
        imageUrl varchar(500) NULL,
        product_url varchar(500) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_collections_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}
