import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecentlyViewedProductsTable1782500000001 implements MigrationInterface {
  name = 'CreateRecentlyViewedProductsTable1782500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recently_viewed_products\` (
        \`user_id\` bigint NOT NULL,
        \`product_id\` bigint NOT NULL,
        \`viewed_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`user_id\`, \`product_id\`),
        KEY \`IDX_recently_viewed_user\` (\`user_id\`),
        KEY \`IDX_recently_viewed_product\` (\`product_id\`),
        CONSTRAINT \`FK_rvp_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_rvp_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`recently_viewed_products\``);
  }
}
