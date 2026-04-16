import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryNameTranslations1745500000000
  implements MigrationInterface
{
  name = 'AddCategoryNameTranslations1745500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`categories\`
        ADD COLUMN \`name_en\` varchar(100) NULL AFTER \`name\`,
        ADD COLUMN \`name_ja\` varchar(100) NULL AFTER \`name_en\`,
        ADD COLUMN \`name_zh\` varchar(100) NULL AFTER \`name_ja\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`categories\`
        DROP COLUMN \`name_zh\`,
        DROP COLUMN \`name_ja\`,
        DROP COLUMN \`name_en\`
    `);
  }
}
