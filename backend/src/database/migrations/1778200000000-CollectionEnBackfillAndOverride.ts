import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Collection 한글 노출 제거.
 *
 * - `/en/collection` 에서 collections.description(한글) / name(한글) 이 그대로 노출되는 문제 수정.
 * - 두 번에 걸쳐 seed 된 collections (legacy + new) 모두 description_en · name_en 을 백필.
 * - 매핑은 id 대신 `type` + `nameKo` (또는 legacy 의 `name` slug) 기준으로 수행하여 환경 간 idempotent.
 * - 추가로 categories 의 한자 괄호 ("Raw Sheng (生茶)" 등) 를 영어에서 제거.
 */
export class CollectionEnBackfillAndOverride1778200000000 implements MigrationInterface {
  name = 'CollectionEnBackfillAndOverride1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET NAMES utf8mb4`);

    // ── 신규 collections (주니/자사/단니/흑니/청회니/주형/석표/서시/편평) description_en 백필 ──
    const newCollectionEn: Array<{ nameKo: string; type: 'clay' | 'shape'; descriptionEn: string }> = [
      { nameKo: '주니', type: 'clay', descriptionEn: 'The <b>most noble clay in Yixing</b>, scarce supply with high value. Crimson zhuni glow with exquisite tea compatibility — ideal for <b>aromatic oolong</b>.' },
      { nameKo: '자사', type: 'clay', descriptionEn: "<b>The foundation clay</b> representing Yixing's <b>Huanglong Mountain</b>. Breathes while <b>regulating heat and aroma</b>. Versatile for any tea." },
      { nameKo: '단니', type: 'clay', descriptionEn: '<b>Zisha clay from Duanni</b>. Vibrant yellow-brown hue works beautifully with lighter oolong, white tea, and aged pu-erh. Soft and clean expression on the tea table.' },
      { nameKo: '흑니', type: 'clay', descriptionEn: '<b>Deep sable Heini (Zisha)</b>. Excellent thermal stability pairs with dark fermented teas — ideal for aged pu-erh and shou pu-erh.' },
      { nameKo: '청회니', type: 'clay', descriptionEn: '<b>Serene ash-toned Qinghuini (Zisha)</b>. Understated depth complements green teas and lighter oolong. A discreet presence on the tea table.' },
      { nameKo: '주형', type: 'shape', descriptionEn: '<b>Bamboo-inspired form (Zhuxing)</b>. Straight lines and slender proportions convey <b>scholarly grace</b>. Structured silhouette for the tea table.' },
      { nameKo: '석표', type: 'shape', descriptionEn: '<b>Stone-pelican shape (Shibiao)</b>. Rounded, stable profile captures <b>old-school solidity</b>. Pair with well-aged teas for generous expression.' },
      { nameKo: '서시', type: 'shape', descriptionEn: '<b>Xi Shi form — named after the Chinese beauty</b>. Soft and full curves with <b>pronounced hip</b>. A graceful feminine silhouette on the tea table.' },
      { nameKo: '편평', type: 'shape', descriptionEn: '<b>Flat-bodied pien-ping form</b>. <b>Wide horizontal spread</b> shows brewed tea leaves beautifully. A measured, generous line for the tea table.' },
    ];

    for (const row of newCollectionEn) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`description_en\` = ? WHERE \`type\` = ? AND \`nameKo\` = ? AND \`description_en\` IS NULL`,
        [row.descriptionEn, row.type, row.nameKo],
      );
    }

    // ── Legacy collections (name 이 slug 이고 nameKo 가 한글) name_en 백필 ──
    const legacyNameEn: Array<{ nameKo: string; nameEn: string }> = [
      { nameKo: '주니', nameEn: 'Zhuni' },
      { nameKo: '단니', nameEn: 'Duani' },
      { nameKo: '자니', nameEn: 'Zini' },
      { nameKo: '흑니', nameEn: 'Heini' },
      { nameKo: '청수니', nameEn: 'Qingshuini' },
      { nameKo: '녹니', nameEn: 'Luni' },
      { nameKo: '서시', nameEn: 'Xi Shi' },
      { nameKo: '석표', nameEn: 'Shibiao' },
      { nameKo: '인왕', nameEn: 'Renwang' },
      { nameKo: '덕종', nameEn: 'Dezhong' },
      { nameKo: '수평', nameEn: 'Shuiping' },
    ];

    for (const row of legacyNameEn) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`name_en\` = ? WHERE \`nameKo\` = ? AND \`name_en\` IS NULL`,
        [row.nameEn, row.nameKo],
      );
    }

    // ── categories: 영어 이름에서 한자 괄호 제거 ──
    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Raw Sheng' WHERE \`id\` = 30 AND \`name_en\` = 'Raw Sheng (生茶)'`,
    );
    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Aged Shucha' WHERE \`id\` = 31 AND \`name_en\` = 'Aged Shucha (熟茶)'`,
    );
    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Old Tea' WHERE \`id\` = 32 AND \`name_en\` = 'Old Tea (老茶)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET NAMES utf8mb4`);

    const newCollectionKo = ['주니', '자사', '단니', '흑니', '청회니', '주형', '석표', '서시', '편평'];
    for (const nameKo of newCollectionKo) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`description_en\` = NULL WHERE \`nameKo\` = ?`,
        [nameKo],
      );
    }

    const legacyKo = ['주니', '단니', '자니', '흑니', '청수니', '녹니', '서시', '석표', '인왕', '덕종', '수평'];
    for (const nameKo of legacyKo) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`name_en\` = NULL WHERE \`nameKo\` = ? AND \`name_en\` IS NOT NULL`,
        [nameKo],
      );
    }

    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Raw Sheng (生茶)' WHERE \`id\` = 30 AND \`name_en\` = 'Raw Sheng'`,
    );
    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Aged Shucha (熟茶)' WHERE \`id\` = 31 AND \`name_en\` = 'Aged Shucha'`,
    );
    await queryRunner.query(
      `UPDATE \`categories\` SET \`name_en\` = 'Old Tea (老茶)' WHERE \`id\` = 32 AND \`name_en\` = 'Old Tea'`,
    );
  }
}
