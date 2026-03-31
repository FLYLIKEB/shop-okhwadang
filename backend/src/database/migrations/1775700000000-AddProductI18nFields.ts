import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductI18nFields1775700000000 implements MigrationInterface {
  name = 'AddProductI18nFields1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // name_en
    const nameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'name_en'
    `);
    if ((nameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`name_en\` VARCHAR(255) NULL AFTER \`name\``);
    }

    // name_ja
    const nameJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'name_ja'
    `);
    if ((nameJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`name_ja\` VARCHAR(255) NULL AFTER \`name_en\``);
    }

    // name_zh
    const nameZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'name_zh'
    `);
    if ((nameZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`name_zh\` VARCHAR(255) NULL AFTER \`name_ja\``);
    }

    // description_en
    const descEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'description_en'
    `);
    if ((descEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`description_en\` TEXT NULL AFTER \`description\``);
    }

    // description_ja
    const descJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'description_ja'
    `);
    if ((descJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`description_ja\` TEXT NULL AFTER \`description_en\``);
    }

    // description_zh
    const descZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'description_zh'
    `);
    if ((descZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`description_zh\` TEXT NULL AFTER \`description_ja\``);
    }

    // short_description_en
    const shortDescEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'short_description_en'
    `);
    if ((shortDescEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`short_description_en\` VARCHAR(500) NULL AFTER \`short_description\``);
    }

    // short_description_ja
    const shortDescJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'short_description_ja'
    `);
    if ((shortDescJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`short_description_ja\` VARCHAR(500) NULL AFTER \`short_description_en\``);
    }

    // short_description_zh
    const shortDescZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'short_description_zh'
    `);
    if ((shortDescZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`products\` ADD \`short_description_zh\` VARCHAR(500) NULL AFTER \`short_description_ja\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`short_description_zh\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`short_description_ja\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`short_description_en\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`description_zh\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`description_ja\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`description_en\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`name_zh\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`name_ja\``);
    await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`name_en\``);
  }
}
