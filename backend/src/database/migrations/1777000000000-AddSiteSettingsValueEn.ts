import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteSettingsValueEn1777000000000 implements MigrationInterface {
  name = 'AddSiteSettingsValueEn1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== value_en =====
    const valueEnExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'value_en'
    `);
    if ((valueEnExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`site_settings\` ADD \`value_en\` TEXT NULL AFTER \`value\``);
    }

    // ===== value_ja =====
    const valueJaExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'value_ja'
    `);
    if ((valueJaExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`site_settings\` ADD \`value_ja\` TEXT NULL AFTER \`value_en\``);
    }

    // ===== value_zh =====
    const valueZhExists = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'value_zh'
    `);
    if ((valueZhExists as Array<{ cnt: string }>)[0].cnt === '0') {
      await queryRunner.query(`ALTER TABLE \`site_settings\` ADD \`value_zh\` TEXT NULL AFTER \`value_ja\``);
    }

    // ===== seed: brand / footer English values =====
    // Insert brand_name if not present, otherwise update value_en
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`value_en\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('brand_name',        '옥화당',                 'Ockhwadang',                            'brand', '브랜드명',       'text', NULL, '옥화당',                 100),
        ('brand_tagline',     '자연을 담은 그릇',        'Vessels that hold nature',             'brand', '브랜드 태그라인', 'text', NULL, '자연을 담은 그릇',        101),
        ('footer_copyright',  '© 2026 옥화당. All rights reserved.', '© 2026 Ockhwadang. All rights reserved.', 'brand', '푸터 저작권',    'text', NULL, '© 2026 옥화당. All rights reserved.', 102),
        ('logo_alt',          '옥화당 로고',             'Ockhwadang Logo',                       'brand', '로고 alt 텍스트', 'text', NULL, '옥화당 로고',            103)
      ON DUPLICATE KEY UPDATE
        \`value_en\` = VALUES(\`value_en\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`site_settings\` DROP COLUMN \`value_zh\``);
    await queryRunner.query(`ALTER TABLE \`site_settings\` DROP COLUMN \`value_ja\``);
    await queryRunner.query(`ALTER TABLE \`site_settings\` DROP COLUMN \`value_en\``);
  }
}
