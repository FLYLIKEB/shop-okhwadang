import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductDetailImagesTable1776000000000 implements MigrationInterface {
  name = 'AddProductDetailImagesTable1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`product_detail_images\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`product_id\` bigint NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`alt\` varchar(255) NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_product_detail_images_product_id\` (\`product_id\`),
        CONSTRAINT \`FK_product_detail_images_product\`
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`product_detail_images\` DROP FOREIGN KEY \`FK_product_detail_images_product\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`product_detail_images\`
    `);
  }
}
