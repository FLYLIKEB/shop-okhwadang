import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateThemeColorsMinimalLuxury1775900000000 implements MigrationInterface {
  name = 'UpdateThemeColorsMinimalLuxury1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('color_primary', '#1C2B3A', 'color', '대표색', 'color', NULL, '#1C2B3A', 1),
        ('color_primary_foreground', '#F7F5F0', 'color', '대표색 텍스트', 'color', NULL, '#F7F5F0', 2),
        ('color_secondary', '#EAE6DF', 'color', '보조색', 'color', NULL, '#EAE6DF', 3),
        ('color_background', '#FDFCF9', 'color', '배경색', 'color', NULL, '#FDFCF9', 4),
        ('color_foreground', '#1A1A1A', 'color', '기본 텍스트색', 'color', NULL, '#1A1A1A', 5),
        ('color_destructive', '#C2410C', 'color', '삭제/경고색', 'color', NULL, '#C2410C', 6),
        ('color_border', '#DDD8D0', 'color', '테두리색', 'color', NULL, '#DDD8D0', 7),
        ('color_muted', '#F0EDE6', 'color', '음소거 배경색', 'color', NULL, '#F0EDE6', 8),
        ('color_muted_foreground', '#78716C', 'color', '음소거 텍스트색', 'color', NULL, '#78716C', 9),
        ('color_ring', '#1C2B3A', 'color', '포커스 링 색', 'color', NULL, '#1C2B3A', 10)
      ON DUPLICATE KEY UPDATE
        \`value\` = VALUES(\`value\`),
        \`default_value\` = VALUES(\`default_value\`),
        \`label\` = VALUES(\`label\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\` WHERE \`setting_key\` IN (
        'color_primary', 'color_primary_foreground',
        'color_secondary', 'color_background', 'color_foreground',
        'color_destructive', 'color_border', 'color_muted',
        'color_muted_foreground', 'color_ring'
      )
    `);
  }
}
