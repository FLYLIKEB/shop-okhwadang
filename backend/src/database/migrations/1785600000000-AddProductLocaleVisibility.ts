import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductLocaleVisibility1785600000000 implements MigrationInterface {
  name = 'AddProductLocaleVisibility1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN is_visible_ko tinyint NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN is_visible_en tinyint NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE products ALTER COLUMN is_visible_en SET DEFAULT 0`);
    await queryRunner.query(`CREATE INDEX IDX_products_is_visible_ko ON products (is_visible_ko)`);
    await queryRunner.query(`CREATE INDEX IDX_products_is_visible_en ON products (is_visible_en)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_products_is_visible_en ON products`);
    await queryRunner.query(`DROP INDEX IDX_products_is_visible_ko ON products`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN is_visible_en`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN is_visible_ko`);
  }
}
