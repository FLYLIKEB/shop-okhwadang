import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsMediaDerivatives1787800000000 implements MigrationInterface {
  name = 'AddCmsMediaDerivatives1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      'journal_entries',
      'cover_image_derivatives',
      '`cover_image_derivatives` JSON NULL AFTER `cover_image_url`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'promotions',
      'image_derivatives',
      '`image_derivatives` JSON NULL AFTER `image_url`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'banners',
      'image_derivatives',
      '`image_derivatives` JSON NULL AFTER `image_url`',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`journal_entries\` DROP COLUMN \`cover_image_derivatives\``,
    );
    await queryRunner.query(`ALTER TABLE \`promotions\` DROP COLUMN \`image_derivatives\``);
    await queryRunner.query(`ALTER TABLE \`banners\` DROP COLUMN \`image_derivatives\``);
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    definition: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`,
    )) as Array<{ cnt: string }>;
    if (rows[0]?.cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
    }
  }
}
