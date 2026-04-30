import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPromotionBannerEnglishSeedData1783300000000 implements MigrationInterface {
  name = 'BackfillPromotionBannerEnglishSeedData1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`banners\`
       SET \`title_en\` = 'Spring Collection — <b>New Zhuni Teapots</b>'
       WHERE \`title\` = '봄 기획전 — <b>주니 신작</b> 입고'
         AND (\`title_en\` IS NULL OR \`title_en\` = '')`,
    );
    await queryRunner.query(
      `UPDATE \`banners\`
       SET \`title_en\` = '<b>Bangzhang Ancient Tree</b> Raw Pu-erh 2019 Limited Arrival'
       WHERE \`title\` = '<b>반장 고수</b> 생병 2019년 한정 입고'
         AND (\`title_en\` IS NULL OR \`title_en\` = '')`,
    );
    await queryRunner.query(
      `UPDATE \`banners\`
       SET \`title_en\` = 'Starter Tea Set — <b>14% Off</b> KRW 240,000'
       WHERE \`title\` = '입문 다도구 세트 — <b>14% 특가</b> 240,000원'
         AND (\`title_en\` IS NULL OR \`title_en\` = '')`,
    );

    await queryRunner.query(
      `UPDATE \`promotions\`
       SET \`title_en\` = 'Spring Collection — New Zhuni Teapots',
           \`description_en\` = 'Limited spring pricing on new <b>Fujian Zhuni</b> Yixing teapots. Small quantities of <b>Zhuni Xishi, Zhuxing, and Shibiao</b> pieces are available and may sell out early.'
       WHERE \`title\` = '봄 기획전 — 주니 신작'
         AND ((\`title_en\` IS NULL OR \`title_en\` = '') OR (\`description_en\` IS NULL OR \`description_en\` = ''))`,
    );
    await queryRunner.query(
      `UPDATE \`promotions\`
       SET \`title_en\` = 'Starter Tea Set 14% Time Sale',
           \`description_en\` = 'Limited special price on the <b>Okhwadang starter tea set</b>. <b>KRW 280,000 → KRW 240,000</b> (KRW 40,000 off). Complete set with Yixing teapot, teacup, tea tray, and tea tools.'
       WHERE \`title\` = '입문 세트 14% 타임세일'
         AND ((\`title_en\` IS NULL OR \`title_en\` = '') OR (\`description_en\` IS NULL OR \`description_en\` = ''))`,
    );
    await queryRunner.query(
      `UPDATE \`promotions\`
       SET \`title_en\` = 'Pu-erh Tea Starter Event',
           \`description_en\` = 'Receive a <b>five-piece bamboo tea tool set</b> with purchase of <b>Dayi 7572 ripe pu-erh cake</b>. Includes essential beginner tools such as tea scoop, needle, tongs, and funnel.'
       WHERE \`title\` = '보이차 입문 이벤트'
         AND ((\`title_en\` IS NULL OR \`title_en\` = '') OR (\`description_en\` IS NULL OR \`description_en\` = ''))`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally no-op: preserve any manually curated production English copy.
  }
}
