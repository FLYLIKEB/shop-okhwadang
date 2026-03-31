import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsI18nFields1775800000000 implements MigrationInterface {
  name = 'AddCmsI18nFields1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== faqs =====

    // question_en
    const faqQuestionEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'question_en'
    `);
    if ((faqQuestionEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`question_en\` VARCHAR(500) NULL AFTER \`question\``);
    }

    // question_ja
    const faqQuestionJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'question_ja'
    `);
    if ((faqQuestionJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`question_ja\` VARCHAR(500) NULL AFTER \`question_en\``);
    }

    // question_zh
    const faqQuestionZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'question_zh'
    `);
    if ((faqQuestionZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`question_zh\` VARCHAR(500) NULL AFTER \`question_ja\``);
    }

    // answer_en
    const faqAnswerEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'answer_en'
    `);
    if ((faqAnswerEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`answer_en\` LONGTEXT NULL AFTER \`answer\``);
    }

    // answer_ja
    const faqAnswerJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'answer_ja'
    `);
    if ((faqAnswerJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`answer_ja\` LONGTEXT NULL AFTER \`answer_en\``);
    }

    // answer_zh
    const faqAnswerZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faqs' AND COLUMN_NAME = 'answer_zh'
    `);
    if ((faqAnswerZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`answer_zh\` LONGTEXT NULL AFTER \`answer_ja\``);
    }

    // ===== notices =====

    // title_en
    const noticeTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'title_en'
    `);
    if ((noticeTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`title_en\` VARCHAR(255) NULL AFTER \`title\``);
    }

    // title_ja
    const noticeTitleJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'title_ja'
    `);
    if ((noticeTitleJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`title_ja\` VARCHAR(255) NULL AFTER \`title_en\``);
    }

    // title_zh
    const noticeTitleZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'title_zh'
    `);
    if ((noticeTitleZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`title_zh\` VARCHAR(255) NULL AFTER \`title_ja\``);
    }

    // content_en
    const noticeContentEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'content_en'
    `);
    if ((noticeContentEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`content_en\` LONGTEXT NULL AFTER \`content\``);
    }

    // content_ja
    const noticeContentJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'content_ja'
    `);
    if ((noticeContentJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`content_ja\` LONGTEXT NULL AFTER \`content_en\``);
    }

    // content_zh
    const noticeContentZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notices' AND COLUMN_NAME = 'content_zh'
    `);
    if ((noticeContentZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`notices\` ADD \`content_zh\` LONGTEXT NULL AFTER \`content_ja\``);
    }

    // ===== pages =====

    // title_en
    const pageTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'title_en'
    `);
    if ((pageTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`title_en\` VARCHAR(255) NULL AFTER \`title\``);
    }

    // title_ja
    const pageTitleJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'title_ja'
    `);
    if ((pageTitleJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`title_ja\` VARCHAR(255) NULL AFTER \`title_en\``);
    }

    // title_zh
    const pageTitleZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'title_zh'
    `);
    if ((pageTitleZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`title_zh\` VARCHAR(255) NULL AFTER \`title_ja\``);
    }

    // content_en
    const pageContentEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'content_en'
    `);
    if ((pageContentEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`content_en\` LONGTEXT NULL AFTER \`title_zh\``);
    }

    // content_ja
    const pageContentJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'content_ja'
    `);
    if ((pageContentJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`content_ja\` LONGTEXT NULL AFTER \`content_en\``);
    }

    // content_zh
    const pageContentZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'content_zh'
    `);
    if ((pageContentZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`pages\` ADD \`content_zh\` LONGTEXT NULL AFTER \`content_ja\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // pages
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`content_zh\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`content_ja\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`content_en\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`title_zh\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`title_ja\``);
    await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`title_en\``);
    // notices
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`content_zh\``);
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`content_ja\``);
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`content_en\``);
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`title_zh\``);
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`title_ja\``);
    await queryRunner.query(`ALTER TABLE \`notices\` DROP COLUMN \`title_en\``);
    // faqs
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`answer_zh\``);
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`answer_ja\``);
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`answer_en\``);
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`question_zh\``);
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`question_ja\``);
    await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`question_en\``);
  }
}
