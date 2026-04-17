import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * /en/ 페이지 남은 한글·한자 노출 제거 (idempotent).
 *
 * 1. nilo_types.description_en 에서 (段泥)·(黑泥)·(青灰泥) 한자 괄호 제거
 * 2. collections 덕종(id=10)·수평(id=11) description_en / name_en 백필
 */
export class RemoveRemainingCjkAndBackfillLegacy1778300000000 implements MigrationInterface {
  name = 'RemoveRemainingCjkAndBackfillLegacy1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET NAMES utf8mb4`);

    // 1. nilo_types.description_en 한자 괄호 제거
    const niloReplacements: Array<[string, string]> = [
      [' (段泥)', ''],
      [' (黑泥)', ''],
      [' (青灰泥)', ''],
    ];
    for (const [oldText, newText] of niloReplacements) {
      await queryRunner.query(
        `UPDATE \`nilo_types\` SET \`description_en\` = REPLACE(\`description_en\`, ?, ?) WHERE \`description_en\` LIKE ?`,
        [oldText, newText, `%${oldText}%`],
      );
    }

    // 2. collections 덕종/수평 description_en 백필 + name_en
    await queryRunner.query(
      `UPDATE \`collections\` SET \`description_en\` = ? WHERE \`nameKo\` = ? AND \`description_en\` IS NULL`,
      [
        'A silhouette that reinterprets the technique of Deokjong, a celebrated Goryeo-era master. Refined and graceful lines for the modern tea table.',
        '덕종',
      ],
    );
    await queryRunner.query(
      `UPDATE \`collections\` SET \`description_en\` = ? WHERE \`nameKo\` = ? AND \`description_en\` IS NULL`,
      [
        'Shuiping — beautiful horizontal curves. An unassuming, tranquil form that brings calm to the tea table.',
        '수평',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET NAMES utf8mb4`);
    // revert nilo description_en by reinserting CJK tokens (best-effort — only if English phrase matches)
    await queryRunner.query(
      `UPDATE \`nilo_types\` SET \`description_en\` = REPLACE(\`description_en\`, 'Duani teapots', 'Duani (段泥) teapots') WHERE \`description_en\` LIKE '%Duani teapots%'`,
    );
    await queryRunner.query(
      `UPDATE \`nilo_types\` SET \`description_en\` = REPLACE(\`description_en\`, 'Heini teapots', 'Heini (黑泥) teapots') WHERE \`description_en\` LIKE '%Heini teapots%'`,
    );
    await queryRunner.query(
      `UPDATE \`nilo_types\` SET \`description_en\` = REPLACE(\`description_en\`, 'Qinghuini teapots', 'Qinghuini (青灰泥) teapots') WHERE \`description_en\` LIKE '%Qinghuini teapots%'`,
    );

    await queryRunner.query(
      `UPDATE \`collections\` SET \`description_en\` = NULL WHERE \`nameKo\` IN ('덕종', '수평')`,
    );
  }
}
