import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateThemeColorsPremiumBW1775600000000 implements MigrationInterface {
  name = 'UpdateThemeColorsPremiumBW1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`site_settings\`
      SET \`value\` = CASE \`setting_key\`
        WHEN 'color_primary' THEN '#0A0A0A'
        WHEN 'color_primary_foreground' THEN '#FAFAFA'
        WHEN 'color_secondary' THEN '#F5F5F5'
        WHEN 'color_secondary_foreground' THEN '#1A1A1A'
        WHEN 'color_background' THEN '#FAFAFA'
        WHEN 'color_foreground' THEN '#111111'
        WHEN 'color_destructive' THEN '#DC2626'
        WHEN 'color_destructive_foreground' THEN '#FFFFFF'
        WHEN 'color_border' THEN '#E5E5E5'
        WHEN 'color_muted' THEN '#F0F0F0'
        WHEN 'color_muted_foreground' THEN '#737373'
        WHEN 'color_ring' THEN '#0A0A0A'
        WHEN 'color_accent' THEN '#171717'
        WHEN 'color_accent_foreground' THEN '#FAFAFA'
        WHEN 'color_card' THEN '#FFFFFF'
        WHEN 'color_card_foreground' THEN '#111111'
        WHEN 'color_input' THEN '#E5E5E5'
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
}
