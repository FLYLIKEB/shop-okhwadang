import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 다국어 지원을 위한 컬럼 추가 및 기존 데이터 백필.
 *
 * - collections.description_en 추가
 * - journal_entries.title_en/subtitle_en/summary_en/content_en 추가
 * - product_options.name_en/value_en 추가
 * - navigation_items.label_en 백필 (NULL인 항목만)
 * - categories.description_en 백필 (NULL인 항목만)
 * - collections.description_en 백필
 * - product_options.name_en/value_en 백필
 *
 * 모든 작업은 idempotent — 컬럼 존재 체크 후 ADD, 값이 비어있는 것만 UPDATE.
 */
export class AddI18nColumnsAndBackfill1778000000000 implements MigrationInterface {
  name = 'AddI18nColumnsAndBackfill1778000000000';

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return (rows as Array<{ cnt: string | number }>)[0].cnt.toString() !== '0';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 1. 컬럼 추가 =====

    // collections.description_en
    if (!(await this.columnExists(queryRunner, 'collections', 'description_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`collections\` ADD \`description_en\` TEXT NULL AFTER \`description\``,
      );
    }

    // journal_entries.title_en / subtitle_en / summary_en / content_en
    if (!(await this.columnExists(queryRunner, 'journal_entries', 'title_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`journal_entries\` ADD \`title_en\` VARCHAR(200) NULL AFTER \`title\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'journal_entries', 'subtitle_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`journal_entries\` ADD \`subtitle_en\` VARCHAR(300) NULL AFTER \`subtitle\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'journal_entries', 'summary_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`journal_entries\` ADD \`summary_en\` TEXT NULL AFTER \`summary\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'journal_entries', 'content_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`journal_entries\` ADD \`content_en\` TEXT NULL AFTER \`content\``,
      );
    }

    // product_options.name_en / value_en
    if (!(await this.columnExists(queryRunner, 'product_options', 'name_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`product_options\` ADD \`name_en\` VARCHAR(100) NULL AFTER \`name\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'product_options', 'value_en'))) {
      await queryRunner.query(
        `ALTER TABLE \`product_options\` ADD \`value_en\` VARCHAR(100) NULL AFTER \`value\``,
      );
    }

    // ===== 2. navigation_items.label_en 백필 (NULL인 것만) =====
    const navMap: Array<[string, string]> = [
      ['홈', 'Home'],
      ['자사호', 'Yixing Teapots'],
      ['보이차·다구', 'Pu-erh & Tea Ware'],
      ['베스트', 'Best Sellers'],
      ['└ 저널', '└ Journal'],
      ['└ 컬렉션', '└ Collection'],
      ['└ 아카이브', '└ Archive'],
      ['브랜드 소개', 'About'],
      ['기획전', 'Collections'],
      ['└ 니료별', '└ By Clay Type'],
      ['└ 주니', '└ Zhuni'],
      ['└ 자사', '└ Zisha'],
      ['└ 단니', '└ Duani'],
      ['└ 흑니', '└ Heini'],
      ['└ 청회니', '└ Qinghuini'],
      ['└ 모양별', '└ By Shape'],
      ['└ 주형', '└ Zhuxing'],
      ['└ 석표', '└ Shibiao'],
      ['└ 서시', '└ Xi Shi'],
      ['└ 편평', '└ Flat'],
      ['└ 보이차', '└ Pu-erh'],
      ['└ 생차', '└ Raw Sheng'],
      ['└ 숙차', '└ Aged Shucha'],
      ['└ 노차', '└ Old Tea'],
      ['└ 다구', '└ Tea Ware'],
      ['└ 다완', '└ Tea Bowl'],
      ['└ 다반', '└ Tea Tray'],
      ['└ 다도구 세트', '└ Tea Set'],
      ['└ 차 도구', '└ Tea Tools'],
      // footer
      ['고객센터', 'Customer Service'],
      ['자주 묻는 질문', 'FAQ'],
      ['배송 안내', 'Shipping Info'],
      ['반품 및 교환', 'Returns & Exchanges'],
      ['이용약관', 'Terms of Service'],
      ['개인정보처리방침', 'Privacy Policy'],
      ['전체 상품', 'All Products'],
      ['컬렉션', 'Collection'],
      ['저널', 'Journal'],
      ['Archive', 'Archive'],
    ];

    for (const [label, labelEn] of navMap) {
      await queryRunner.query(
        `UPDATE \`navigation_items\` SET \`label_en\` = ? WHERE \`label\` = ? AND \`label_en\` IS NULL`,
        [labelEn, label],
      );
    }

    // ===== 3. categories.description_en 백필 (NULL인 것만) =====
    const categoryDescriptions: Array<[number, string]> = [
      [
        1,
        'Handcrafted Yixing teapots fired from Zisha clay. Building on <b>600 years of tradition</b>, authentic teapots crafted directly with Chinese masters. Includes limited edition <b>Zhuni</b> works from Fujian province.',
      ],
      [
        2,
        'Pu-erh tea imported directly from <b>Yunnan ancient tea mountains</b> of <b>Menghai · Yiwu</b>. Experience <b>the deep layers</b> shaped by time. Curated selection of Banzhang, Bingdao, and Dayi varieties.',
      ],
      [
        3,
        '<b>Complete tea ware</b> to elevate the tea table. Tea ware, tea bowls, and tea trays from Jingdezhen blue-and-white and Tenmoku. Compose a ritual that complements your teapot.',
      ],
      [
        4,
        'A curated selection of <b>tea leaves directly imported from origin</b>. Features premium Yunnan pu-erh (Banzhang · Bingdao · Dayi) sourced directly. Savor the depth of aged tea.',
      ],
    ];
    for (const [id, descEn] of categoryDescriptions) {
      await queryRunner.query(
        `UPDATE \`categories\` SET \`description_en\` = ? WHERE \`id\` = ? AND \`description_en\` IS NULL`,
        [descEn, id],
      );
    }

    // ===== 4. collections.description_en 백필 =====
    const collectionDescriptions: Array<[number, string]> = [
      [
        1,
        'The <b>most noble clay in Yixing</b>, scarce supply with high value. Crimson zhuni glow with exquisite tea compatibility — ideal for <b>aromatic oolong</b>.',
      ],
      [
        2,
        "<b>The foundation clay</b> representing Yixing's <b>Huanglong Mountain</b>. Breathes while <b>regulating heat and aroma</b>. Versatile for any tea.",
      ],
      [
        3,
        '<b>Zisha clay from Duanni</b>. Vibrant yellow-brown hue works beautifully with lighter oolong, white tea, and aged pu-erh. Soft and clean expression on the tea table.',
      ],
      [
        4,
        '<b>Deep sable Heini (Zisha)</b>. Excellent thermal stability pairs with dark fermented teas — ideal for aged pu-erh and shou pu-erh.',
      ],
      [
        5,
        '<b>Serene ash-toned Qinghuini (Zisha)</b>. Understated depth complements green teas and lighter oolong. A discreet presence on the tea table.',
      ],
      [
        6,
        '<b>Bamboo-inspired form (Zhuxing)</b>. Straight lines and slender proportions convey <b>scholarly grace</b>. Structured silhouette for the tea table.',
      ],
      [
        7,
        '<b>Stone-pelican shape (Shibiao)</b>. Rounded, stable profile captures <b>old-school solidity</b>. Pair with well-aged teas for generous expression.',
      ],
      [
        8,
        '<b>Xi Shi form — named after the Chinese beauty</b>. Soft and full curves with <b>pronounced hip</b>. A graceful feminine silhouette on the tea table.',
      ],
      [
        9,
        '<b>Flat-bodied pien-ping form</b>. <b>Wide horizontal spread</b> shows brewed tea leaves beautifully. A measured, generous line for the tea table.',
      ],
    ];
    for (const [id, descEn] of collectionDescriptions) {
      await queryRunner.query(
        `UPDATE \`collections\` SET \`description_en\` = ? WHERE \`id\` = ? AND \`description_en\` IS NULL`,
        [descEn, id],
      );
    }

    // ===== 5. product_options.name_en / value_en 백필 =====
    const optionNameMap: Array<[string, string]> = [
      ['포장', 'Packaging'],
      ['보관', 'Storage'],
      ['자사호 니료', 'Teapot Clay'],
    ];
    for (const [name, nameEn] of optionNameMap) {
      await queryRunner.query(
        `UPDATE \`product_options\` SET \`name_en\` = ? WHERE \`name\` = ? AND \`name_en\` IS NULL`,
        [nameEn, name],
      );
    }

    const optionValueMap: Array<[string, string]> = [
      ['일반 포장', 'Standard Packaging'],
      ['전통 목함 선물포장', 'Traditional Wooden Gift Box'],
      ['기본 포장', 'Basic Packaging'],
      ['전통 죽지 보관함 포함', 'Traditional Bamboo Paper Case'],
      ['자사 (기본)', 'Zisha (Default)'],
      ['단니 (+20,000)', 'Duani (+20,000)'],
      ['주니 (+50,000)', 'Zhuni (+50,000)'],
    ];
    for (const [value, valueEn] of optionValueMap) {
      await queryRunner.query(
        `UPDATE \`product_options\` SET \`value_en\` = ? WHERE \`value\` = ? AND \`value_en\` IS NULL`,
        [valueEn, value],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // product_options
    if (await this.columnExists(queryRunner, 'product_options', 'value_en')) {
      await queryRunner.query(`ALTER TABLE \`product_options\` DROP COLUMN \`value_en\``);
    }
    if (await this.columnExists(queryRunner, 'product_options', 'name_en')) {
      await queryRunner.query(`ALTER TABLE \`product_options\` DROP COLUMN \`name_en\``);
    }

    // journal_entries
    if (await this.columnExists(queryRunner, 'journal_entries', 'content_en')) {
      await queryRunner.query(`ALTER TABLE \`journal_entries\` DROP COLUMN \`content_en\``);
    }
    if (await this.columnExists(queryRunner, 'journal_entries', 'summary_en')) {
      await queryRunner.query(`ALTER TABLE \`journal_entries\` DROP COLUMN \`summary_en\``);
    }
    if (await this.columnExists(queryRunner, 'journal_entries', 'subtitle_en')) {
      await queryRunner.query(`ALTER TABLE \`journal_entries\` DROP COLUMN \`subtitle_en\``);
    }
    if (await this.columnExists(queryRunner, 'journal_entries', 'title_en')) {
      await queryRunner.query(`ALTER TABLE \`journal_entries\` DROP COLUMN \`title_en\``);
    }

    // collections
    if (await this.columnExists(queryRunner, 'collections', 'description_en')) {
      await queryRunner.query(`ALTER TABLE \`collections\` DROP COLUMN \`description_en\``);
    }
  }
}
