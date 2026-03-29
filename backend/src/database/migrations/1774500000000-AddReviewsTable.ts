import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewsTable1774500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`reviews\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`product_id\` bigint NOT NULL,
        \`order_item_id\` bigint NOT NULL,
        \`rating\` tinyint UNSIGNED NOT NULL,
        \`content\` text NULL,
        \`image_urls\` json NULL,
        \`is_visible\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_review_order_item\` (\`order_item_id\`),
        KEY \`IDX_review_product_id\` (\`product_id\`),
        KEY \`IDX_review_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign keys if they don't exist
    await this.addFkIfNotExists(
      queryRunner,
      'reviews',
      'FK_review_user',
      'ALTER TABLE `reviews` ADD CONSTRAINT `FK_review_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE',
    );

    await this.addFkIfNotExists(
      queryRunner,
      'reviews',
      'FK_review_product',
      'ALTER TABLE `reviews` ADD CONSTRAINT `FK_review_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropFkIfExists(queryRunner, 'reviews', 'FK_review_product');
    await this.dropFkIfExists(queryRunner, 'reviews', 'FK_review_user');
    await queryRunner.query('DROP TABLE IF EXISTS `reviews`');
  }

  private async addFkIfNotExists(
    queryRunner: QueryRunner,
    table: string,
    fkName: string,
    addSql: string,
  ): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [table, fkName],
    ) as Array<{ CONSTRAINT_NAME: string }>;
    if (!row) await queryRunner.query(addSql);
  }

  private async dropFkIfExists(
    queryRunner: QueryRunner,
    table: string,
    fkName: string,
  ): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [table, fkName],
    ) as Array<{ CONSTRAINT_NAME: string }>;
    if (row) await queryRunner.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
  }
}
