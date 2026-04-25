import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductReviewStats1783100000000 implements MigrationInterface {
  name = 'AddProductReviewStats1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`products\`
       ADD \`review_count\` int UNSIGNED NOT NULL DEFAULT 0,
       ADD \`avg_rating\` decimal(3,2) NOT NULL DEFAULT '0.00'`,
    );
    await queryRunner.query('CREATE INDEX `IDX_products_review_count` ON `products` (`review_count`)');
    await queryRunner.query('CREATE INDEX `IDX_products_avg_rating` ON `products` (`avg_rating`)');
    await queryRunner.query(
      `UPDATE \`products\` p
       LEFT JOIN (
         SELECT \`product_id\`, COUNT(*) AS \`review_count\`, COALESCE(AVG(\`rating\`), 0) AS \`avg_rating\`
         FROM \`reviews\`
         WHERE \`is_visible\` = 1
         GROUP BY \`product_id\`
       ) rs ON rs.\`product_id\` = p.\`id\`
       SET p.\`review_count\` = COALESCE(rs.\`review_count\`, 0),
           p.\`avg_rating\` = COALESCE(rs.\`avg_rating\`, 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_products_avg_rating` ON `products`');
    await queryRunner.query('DROP INDEX `IDX_products_review_count` ON `products`');
    await queryRunner.query(
      'ALTER TABLE `products` DROP COLUMN `avg_rating`, DROP COLUMN `review_count`',
    );
  }
}
