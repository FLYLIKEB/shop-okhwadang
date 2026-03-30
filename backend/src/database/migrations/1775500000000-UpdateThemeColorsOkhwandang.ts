import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateThemeColorsOkhwandang1775500000000 implements MigrationInterface {
  name = 'UpdateThemeColorsOkhwandang1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`site_settings\`
      SET \`value\` = CASE \`setting_key\`
        WHEN 'color_primary' THEN '#8B5A2B'
        WHEN 'color_primary_foreground' THEN '#FDFBF7'
        WHEN 'color_secondary' THEN '#F5E6D3'
        WHEN 'color_secondary_foreground' THEN '#3D2314'
        WHEN 'color_background' THEN '#FDFBF7'
        WHEN 'color_foreground' THEN '#2C1810'
        WHEN 'color_destructive' THEN '#B91C1C'
        WHEN 'color_destructive_foreground' THEN '#FFFFFF'
        WHEN 'color_border' THEN '#E8DDD4'
        WHEN 'color_muted' THEN '#F5F0EB'
        WHEN 'color_muted_foreground' THEN '#8B7355'
        WHEN 'color_ring' THEN '#8B5A2B'
        WHEN 'color_accent' THEN '#C4A77D'
        WHEN 'color_accent_foreground' THEN '#2C1810'
        WHEN 'color_card' THEN '#FFFFFF'
        WHEN 'color_card_foreground' THEN '#2C1810'
        WHEN 'color_input' THEN '#E8DDD4'
        ELSE \`value\`
      END
      WHERE \`setting_key\` IN (
        'color_primary', 'color_primary_foreground',
        'color_secondary', 'color_secondary_foreground',
        'color_background', 'color_foreground',
        'color_destructive', 'color_destructive_foreground',
        'color_border', 'color_muted', 'color_muted_foreground',
        'color_ring', 'color_accent', 'color_accent_foreground',
        'color_card', 'color_card_foreground', 'color_input'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`site_settings\`
      SET \`value\` = CASE \`setting_key\`
        WHEN 'color_primary' THEN '#2563eb'
        WHEN 'color_primary_foreground' THEN '#ffffff'
        WHEN 'color_secondary' THEN '#f1f5f9'
        WHEN 'color_secondary_foreground' THEN '#0f172a'
        WHEN 'color_background' THEN '#ffffff'
        WHEN 'color_foreground' THEN '#0f172a'
        WHEN 'color_destructive' THEN '#ef4444'
        WHEN 'color_destructive_foreground' THEN '#ffffff'
        WHEN 'color_border' THEN '#e2e8f0'
        WHEN 'color_muted' THEN '#f1f5f9'
        WHEN 'color_muted_foreground' THEN '#64748b'
        WHEN 'color_ring' THEN '#2563eb'
        WHEN 'color_accent' THEN '#f1f5f9'
        WHEN 'color_accent_foreground' THEN '#0f172a'
        WHEN 'color_card' THEN '#ffffff'
        WHEN 'color_card_foreground' THEN '#0f172a'
        WHEN 'color_input' THEN '#e2e8f0'
        ELSE \`value\`
      END
      WHERE \`setting_key\` IN (
        'color_primary', 'color_primary_foreground',
        'color_secondary', 'color_secondary_foreground',
        'color_background', 'color_foreground',
        'color_destructive', 'color_destructive_foreground',
        'color_border', 'color_muted', 'color_muted_foreground',
        'color_ring', 'color_accent', 'color_accent_foreground',
        'color_card', 'color_card_foreground', 'color_input'
      )
    `);
  }
}
