import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClayTypeAndShapeToProducts1776200000000 implements MigrationInterface {
  name = 'AddClayTypeAndShapeToProducts1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD COLUMN \`clay_type\` varchar(50) NULL AFTER \`view_count\`,
        ADD COLUMN \`teapot_shape\` varchar(50) NULL AFTER \`clay_type\`,
        ADD INDEX \`IDX_products_clay_type\` (\`clay_type\`),
        ADD INDEX \`IDX_products_teapot_shape\` (\`teapot_shape\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`products\`
        DROP INDEX \`IDX_products_teapot_shape\`,
        DROP INDEX \`IDX_products_clay_type\`,
        DROP COLUMN \`teapot_shape\`,
        DROP COLUMN \`clay_type\`
    `);
  }
}
