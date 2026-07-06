import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkAllAttributesFilterable1786400000000 implements MigrationInterface {
  name = 'MarkAllAttributesFilterable1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE \`attribute_types\` SET \`is_filterable\` = 1 WHERE \`is_active\` = 1`);
  }

  public async down(): Promise<void> {
    // Data-only migration. Do not guess which legacy rows were non-filterable.
  }
}
