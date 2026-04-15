import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNiloTypesRegionEn1776700000000 implements MigrationInterface {
  name = 'AddNiloTypesRegionEn1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const regionEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nilo_types' AND COLUMN_NAME = 'region_en'
    `);
    if ((regionEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`nilo_types\` ADD \`region_en\` VARCHAR(200) NULL AFTER \`region\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`nilo_types\` DROP COLUMN \`region_en\``);
  }
}