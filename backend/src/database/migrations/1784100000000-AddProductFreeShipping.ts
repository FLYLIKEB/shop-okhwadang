import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFreeShipping1784100000000 implements MigrationInterface {
  name = 'AddProductFreeShipping1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `products` ADD `is_free_shipping` tinyint NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_products_is_free_shipping` ON `products` (`is_free_shipping`)',
    );
    await queryRunner.query(
      'ALTER TABLE `order_items` ADD `is_free_shipping` tinyint NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `order_items` DROP COLUMN `is_free_shipping`',
    );
    await queryRunner.query('DROP INDEX `IDX_products_is_free_shipping` ON `products`');
    await queryRunner.query(
      'ALTER TABLE `products` DROP COLUMN `is_free_shipping`',
    );
  }
}
