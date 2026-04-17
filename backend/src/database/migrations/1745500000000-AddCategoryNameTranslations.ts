import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryNameTranslations1745500000000
  implements MigrationInterface
{
  name = 'AddCategoryNameTranslations1745500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_en'
    `);
    if ((nameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`
        ALTER TABLE \`categories\`
          ADD COLUMN \`name_en\` varchar(100) NULL AFTER \`name\`
      `);
    }

    const nameJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_ja'
    `);
    if ((nameJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`
        ALTER TABLE \`categories\`
          ADD COLUMN \`name_ja\` varchar(100) NULL AFTER \`name_en\`
      `);
    }

    const nameZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_zh'
    `);
    if ((nameZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`
        ALTER TABLE \`categories\`
          ADD COLUMN \`name_zh\` varchar(100) NULL AFTER \`name_ja\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const nameZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_zh'
    `);
    if ((nameZhExists as Array<{ cnt: string }>)[0].cnt !== '0') {
      await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`name_zh\``);
    }

    const nameJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_ja'
    `);
    if ((nameJaExists as Array<{ cnt: string }>)[0].cnt !== '0') {
      await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`name_ja\``);
    }

    const nameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_en'
    `);
    if ((nameEnExists as Array<{ cnt: string }>)[0].cnt !== '0') {
      await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`name_en\``);
    }
  }
}
