import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingThemeDefaults1775400000000 implements MigrationInterface {
  name = 'AddMissingThemeDefaults1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_secondary_foreground', '#0f172a', 'color', '보조색 텍스트', 'color', NULL, '#0f172a', 3),
        ('color_destructive_foreground', '#ffffff', 'color', '삭제/경고색 텍스트', 'color', NULL, '#ffffff', 7),
        ('color_accent', '#f1f5f9', 'color', '강조색', 'color', NULL, '#f1f5f9', 11),
        ('color_accent_foreground', '#0f172a', 'color', '강조색 텍스트', 'color', NULL, '#0f172a', 12),
        ('color_card', '#ffffff', 'color', '카드 배경색', 'color', NULL, '#ffffff', 13),
        ('color_card_foreground', '#0f172a', 'color', '카드 텍스트색', 'color', NULL, '#0f172a', 14),
        ('color_input', '#e2e8f0', 'color', '입력 필드 색', 'color', NULL, '#e2e8f0', 15)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\`
      WHERE \`setting_key\` IN (
        'color_secondary_foreground',
        'color_destructive_foreground',
        'color_accent',
        'color_accent_foreground',
        'color_card',
        'color_card_foreground',
        'color_input'
      )
    `);
  }
}
