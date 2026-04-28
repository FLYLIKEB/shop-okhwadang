import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDarkModeColorSettings1783000000000 implements MigrationInterface {
  name = 'AddDarkModeColorSettings1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_dark_primary',              '#C4956A', 'color_dark', '다크 대표색',           'color', NULL, '#C4956A', 101),
        ('color_dark_primary_foreground',   '#141210', 'color_dark', '다크 대표색 텍스트',     'color', NULL, '#141210', 102),
        ('color_dark_secondary',            '#1E1C18', 'color_dark', '다크 보조색',           'color', NULL, '#1E1C18', 103),
        ('color_dark_secondary_foreground', '#E8E0D4', 'color_dark', '다크 보조색 텍스트',     'color', NULL, '#E8E0D4', 104),
        ('color_dark_background',           '#141210', 'color_dark', '다크 배경색',           'color', NULL, '#141210', 105),
        ('color_dark_foreground',           '#F0EDE8', 'color_dark', '다크 기본 텍스트색',     'color', NULL, '#F0EDE8', 106),
        ('color_dark_card',                 '#1A1714', 'color_dark', '다크 카드 배경',         'color', NULL, '#1A1714', 107),
        ('color_dark_card_foreground',      '#F0EDE8', 'color_dark', '다크 카드 텍스트',       'color', NULL, '#F0EDE8', 108),
        ('color_dark_border',               '#2E2822', 'color_dark', '다크 테두리색',          'color', NULL, '#2E2822', 109),
        ('color_dark_input',                '#2E2822', 'color_dark', '다크 인풋 배경',         'color', NULL, '#2E2822', 110),
        ('color_dark_muted',                '#1E1C18', 'color_dark', '다크 음소거 배경',       'color', NULL, '#1E1C18', 111),
        ('color_dark_muted_foreground',     '#9B8E7E', 'color_dark', '다크 음소거 텍스트',     'color', NULL, '#9B8E7E', 112),
        ('color_dark_accent',               '#1E1C18', 'color_dark', '다크 액센트 배경',       'color', NULL, '#1E1C18', 113),
        ('color_dark_accent_foreground',    '#E8E0D4', 'color_dark', '다크 액센트 텍스트',     'color', NULL, '#E8E0D4', 114),
        ('color_dark_destructive',          '#ef4444', 'color_dark', '다크 삭제/경고색',       'color', NULL, '#ef4444', 115),
        ('color_dark_destructive_foreground','#ffffff', 'color_dark', '다크 경고 텍스트',      'color', NULL, '#ffffff', 116),
        ('color_dark_ring',                 '#C4956A', 'color_dark', '다크 포커스 링 색',      'color', NULL, '#C4956A', 117)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\`
      WHERE \`setting_key\` IN (
        'color_dark_primary', 'color_dark_primary_foreground',
        'color_dark_secondary', 'color_dark_secondary_foreground',
        'color_dark_background', 'color_dark_foreground',
        'color_dark_card', 'color_dark_card_foreground',
        'color_dark_border', 'color_dark_input',
        'color_dark_muted', 'color_dark_muted_foreground',
        'color_dark_accent', 'color_dark_accent_foreground',
        'color_dark_destructive', 'color_dark_destructive_foreground',
        'color_dark_ring'
      )
    `);
  }
}
