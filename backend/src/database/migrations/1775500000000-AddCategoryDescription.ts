import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryDescription1775500000000 implements MigrationInterface {
  name = 'AddCategoryDescription1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`categories\` ADD \`description\` TEXT NULL AFTER \`image_url\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`categories\` DROP COLUMN \`description\`
    `);
  }
}
