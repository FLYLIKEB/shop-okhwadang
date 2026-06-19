import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductNoticeInfo1784700000000 implements MigrationInterface {
  name = 'AddProductNoticeInfo1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
      ADD COLUMN \`notice_info\` JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
      DROP COLUMN \`notice_info\`
    `);
  }
}
