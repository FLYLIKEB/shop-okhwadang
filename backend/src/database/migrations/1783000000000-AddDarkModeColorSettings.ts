import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDarkModeColorSettings1783000000000 implements MigrationInterface {
  name = 'AddDarkModeColorSettings1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_dark_primary',              '#9C9C9C', 'color_dark', '다크 대표색',           'color', NULL, '#9C9C9C', 101),
        ('color_dark_primary_foreground',   '#121212', 'color_dark', '다크 대표색 텍스트',     'color', NULL, '#121212', 102),
        ('color_dark_secondary',            '#1C1C1C', 'color_dark', '다크 보조색',           'color', NULL, '#1C1C1C', 103),
        ('color_dark_secondary_foreground', '#E1E1E1', 'color_dark', '다크 보조색 텍스트',     'color', NULL, '#E1E1E1', 104),
        ('color_dark_background',           '#121212', 'color_dark', '다크 배경색',           'color', NULL, '#121212', 105),
        ('color_dark_foreground',           '#EDEDED', 'color_dark', '다크 기본 텍스트색',     'color', NULL, '#EDEDED', 106),
        ('color_dark_card',                 '#171717', 'color_dark', '다크 카드 배경',         'color', NULL, '#171717', 107),
        ('color_dark_card_foreground',      '#EDEDED', 'color_dark', '다크 카드 텍스트',       'color', NULL, '#EDEDED', 108),
        ('color_dark_border',               '#292929', 'color_dark', '다크 테두리색',          'color', NULL, '#292929', 109),
        ('color_dark_input',                '#292929', 'color_dark', '다크 인풋 배경',         'color', NULL, '#292929', 110),
        ('color_dark_muted',                '#1C1C1C', 'color_dark', '다크 음소거 배경',       'color', NULL, '#1C1C1C', 111),
        ('color_dark_muted_foreground',     '#909090', 'color_dark', '다크 음소거 텍스트',     'color', NULL, '#909090', 112),
        ('color_dark_accent',               '#1C1C1C', 'color_dark', '다크 액센트 배경',       'color', NULL, '#1C1C1C', 113),
        ('color_dark_accent_foreground',    '#E1E1E1', 'color_dark', '다크 액센트 텍스트',     'color', NULL, '#E1E1E1', 114),
        ('color_dark_destructive',          '#686868', 'color_dark', '다크 삭제/경고색',       'color', NULL, '#686868', 115),
        ('color_dark_destructive_foreground','#ffffff', 'color_dark', '다크 경고 텍스트',      'color', NULL, '#ffffff', 116),
        ('color_dark_ring',                 '#9C9C9C', 'color_dark', '다크 포커스 링 색',      'color', NULL, '#9C9C9C', 117)
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
