import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnglishColumns1776600000000 implements MigrationInterface {
  name = 'AddEnglishColumns1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== inquiries =====
    const inquiryTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'title_en'
    `);
    if ((inquiryTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`inquiries\` ADD \`title_en\` VARCHAR(255) NULL AFTER \`title\``);
    }

    const inquiryContentEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'content_en'
    `);
    if ((inquiryContentEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`inquiries\` ADD \`content_en\` LONGTEXT NULL AFTER \`content\``);
    }

    // ===== promotions =====
    const promotionTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'title_en'
    `);
    if ((promotionTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`promotions\` ADD \`title_en\` VARCHAR(255) NULL AFTER \`title\``);
    }

    const promotionDescEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotions' AND COLUMN_NAME = 'description_en'
    `);
    if ((promotionDescEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`promotions\` ADD \`description_en\` LONGTEXT NULL AFTER \`description\``);
    }

    // ===== banners =====
    const bannerTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banners' AND COLUMN_NAME = 'title_en'
    `);
    if ((bannerTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`banners\` ADD \`title_en\` VARCHAR(255) NULL AFTER \`title\``);
    }

    // ===== coupons =====
    const couponNameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'name_en'
    `);
    if ((couponNameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`coupons\` ADD \`name_en\` VARCHAR(255) NULL AFTER \`name\``);
    }

    // ===== navigation_items =====
    const navLabelEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'navigation_items' AND COLUMN_NAME = 'label_en'
    `);
    if ((navLabelEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`navigation_items\` ADD \`label_en\` VARCHAR(100) NULL AFTER \`label\``);
    }

    // ===== categories =====
    const catNameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name_en'
    `);
    if ((catNameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`categories\` ADD \`name_en\` VARCHAR(100) NULL AFTER \`name\``);
    }

    const catDescEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'description_en'
    `);
    if ((catDescEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`categories\` ADD \`description_en\` TEXT NULL AFTER \`description\``);
    }

    // ===== collections =====
    const collNameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collections' AND COLUMN_NAME = 'name_en'
    `);
    if ((collNameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`collections\` ADD \`name_en\` VARCHAR(100) NULL AFTER \`name\``);
    }

    // ===== nilo_types (NiloType) =====
    const niloNameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nilo_types' AND COLUMN_NAME = 'name_en'
    `);
    if ((niloNameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`nilo_types\` ADD \`name_en\` VARCHAR(100) NULL AFTER \`name\``);
    }

    const niloDescEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nilo_types' AND COLUMN_NAME = 'description_en'
    `);
    if ((niloDescEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`nilo_types\` ADD \`description_en\` TEXT NULL AFTER \`description\``);
    }

    // ===== process_steps (ProcessStep) =====
    const procTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'process_steps' AND COLUMN_NAME = 'title_en'
    `);
    if ((procTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`process_steps\` ADD \`title_en\` VARCHAR(100) NULL AFTER \`title\``);
    }

    const procDescEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'process_steps' AND COLUMN_NAME = 'description_en'
    `);
    if ((procDescEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`process_steps\` ADD \`description_en\` VARCHAR(200) NULL AFTER \`description\``);
    }

    const procDetailEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'process_steps' AND COLUMN_NAME = 'detail_en'
    `);
    if ((procDetailEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`process_steps\` ADD \`detail_en\` TEXT NULL AFTER \`detail\``);
    }

    // ===== artists (Artist) =====
    const artistNameEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'name_en'
    `);
    if ((artistNameEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`artists\` ADD \`name_en\` VARCHAR(100) NULL AFTER \`name\``);
    }

    const artistTitleEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'title_en'
    `);
    if ((artistTitleEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`artists\` ADD \`title_en\` VARCHAR(100) NULL AFTER \`title\``);
    }

    const artistRegionEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'region_en'
    `);
    if ((artistRegionEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`artists\` ADD \`region_en\` VARCHAR(100) NULL AFTER \`region\``);
    }

    const artistStoryEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'story_en'
    `);
    if ((artistStoryEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`artists\` ADD \`story_en\` TEXT NULL AFTER \`story\``);
    }

    const artistSpecEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'specialty_en'
    `);
    if ((artistSpecEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`artists\` ADD \`specialty_en\` VARCHAR(200) NULL AFTER \`specialty\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // artists
    await queryRunner.query(`ALTER TABLE \`artists\` DROP COLUMN \`specialty_en\``);
    await queryRunner.query(`ALTER TABLE \`artists\` DROP COLUMN \`story_en\``);
    await queryRunner.query(`ALTER TABLE \`artists\` DROP COLUMN \`region_en\``);
    await queryRunner.query(`ALTER TABLE \`artists\` DROP COLUMN \`title_en\``);
    await queryRunner.query(`ALTER TABLE \`artists\` DROP COLUMN \`name_en\``);

    // process_steps
    await queryRunner.query(`ALTER TABLE \`process_steps\` DROP COLUMN \`detail_en\``);
    await queryRunner.query(`ALTER TABLE \`process_steps\` DROP COLUMN \`description_en\``);
    await queryRunner.query(`ALTER TABLE \`process_steps\` DROP COLUMN \`title_en\``);

    // nilo_types
    await queryRunner.query(`ALTER TABLE \`nilo_types\` DROP COLUMN \`description_en\``);
    await queryRunner.query(`ALTER TABLE \`nilo_types\` DROP COLUMN \`name_en\``);

    // collections
    await queryRunner.query(`ALTER TABLE \`collections\` DROP COLUMN \`name_en\``);

    // categories
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`description_en\``);
    await queryRunner.query(`ALTER TABLE \`categories\` DROP COLUMN \`name_en\``);

    // navigation_items
    await queryRunner.query(`ALTER TABLE \`navigation_items\` DROP COLUMN \`label_en\``);

    // coupons
    await queryRunner.query(`ALTER TABLE \`coupons\` DROP COLUMN \`name_en\``);

    // banners
    await queryRunner.query(`ALTER TABLE \`banners\` DROP COLUMN \`title_en\``);

    // promotions
    await queryRunner.query(`ALTER TABLE \`promotions\` DROP COLUMN \`description_en\``);
    await queryRunner.query(`ALTER TABLE \`promotions\` DROP COLUMN \`title_en\``);

    // inquiries
    await queryRunner.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`content_en\``);
    await queryRunner.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`title_en\``);
  }
}