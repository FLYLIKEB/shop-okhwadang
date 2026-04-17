import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * nilo_types.characteristics_en (JSON) 컬럼 추가 및 영어 특성 백필.
 *
 * idempotent — 컬럼 존재 체크 후 ADD, 비어있는 row 만 UPDATE.
 */
export class AddNiloCharacteristicsEn1778100000000 implements MigrationInterface {
  name = 'AddNiloCharacteristicsEn1778100000000';

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return (rows as Array<{ cnt: string | number }>)[0].cnt.toString() !== '0';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'nilo_types', 'characteristics_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`nilo_types\` ADD \`characteristics_en\` JSON NULL AFTER \`characteristics\``,
      );
    }

    // 한글 특성 → 영어 번역 매핑 (id 기반 UPDATE)
    const translations: Array<[number, string[]]> = [
      [1, ['Reddish Amber', 'High Shrinkage', 'Fast Heat Conduction', 'High-mountain Oolong & Black Tea']],
      [2, ['Purple Hue', 'Excellent Porosity', 'Ideal for Fermented Tea', 'Develops Sheen']],
      [3, ['Bright Yellow Tone', 'Light Color', 'Clean Taste', 'Green/White/Light-Oxidized Oolong']],
      [4, ['Deep Black', 'Substantial Presence', 'Excellent Heat Retention', 'Aged Shucha & Black Tea']],
      [5, ['Blue-Gray Tone', 'Subtle Palette', 'Refined Aesthetic', 'Sheng Pu-erh & White Tea']],
      [6, ['Green Tone', 'Cool Presence', 'Clean Profile', 'Green Tea & White Tea']],
    ];

    for (const [id, chars] of translations) {
      await queryRunner.query(
        `UPDATE \`nilo_types\` SET characteristics_en = ? WHERE id = ? AND characteristics_en IS NULL`,
        [JSON.stringify(chars), id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'nilo_types', 'characteristics_en')) {
      await queryRunner.query(`ALTER TABLE \`nilo_types\` DROP COLUMN \`characteristics_en\``);
    }
  }
}
