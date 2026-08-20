import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImageThumbnailUrl1787900000000 implements MigrationInterface {
  name = 'AddProductImageThumbnailUrl1787900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `product_images` ADD `thumbnail_url` varchar(500) NULL AFTER `url`",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `product_images` DROP COLUMN `thumbnail_url`',
    );
  }
}
