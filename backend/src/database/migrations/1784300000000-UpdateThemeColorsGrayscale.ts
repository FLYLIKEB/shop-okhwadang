import { MigrationInterface, QueryRunner } from 'typeorm';

const LIGHT_THEME_COLORS: Record<string, string> = {
  color_primary: '#353535',
  color_primary_foreground: '#ffffff',
  color_secondary: '#F0F0F0',
  color_secondary_foreground: '#1a1a1a',
  color_background: '#F9F9F9',
  color_foreground: '#1a1a1a',
  color_destructive: '#3D3D3D',
  color_destructive_foreground: '#ffffff',
  color_border: '#E1E1E1',
  color_muted: '#F0F0F0',
  color_muted_foreground: '#525252',
  color_ring: '#353535',
  color_accent: '#F0F0F0',
  color_accent_foreground: '#1a1a1a',
  color_card: '#F9F9F9',
  color_card_foreground: '#1a1a1a',
  color_input: '#E1E1E1',
};

const DARK_THEME_COLORS: Record<string, string> = {
  color_dark_primary: '#9C9C9C',
  color_dark_primary_foreground: '#121212',
  color_dark_secondary: '#1C1C1C',
  color_dark_secondary_foreground: '#E1E1E1',
  color_dark_background: '#121212',
  color_dark_foreground: '#EDEDED',
  color_dark_card: '#171717',
  color_dark_card_foreground: '#EDEDED',
  color_dark_border: '#292929',
  color_dark_input: '#292929',
  color_dark_muted: '#1C1C1C',
  color_dark_muted_foreground: '#909090',
  color_dark_accent: '#1C1C1C',
  color_dark_accent_foreground: '#E1E1E1',
  color_dark_destructive: '#686868',
  color_dark_destructive_foreground: '#ffffff',
  color_dark_ring: '#9C9C9C',
};

const LEGACY_LIGHT_THEME_COLORS: Record<string, string> = {
  color_primary: '#8B5A2B',
  color_primary_foreground: '#FDFBF7',
  color_secondary: '#F5E6D3',
  color_secondary_foreground: '#3D2314',
  color_background: '#FDFBF7',
  color_foreground: '#2C1810',
  color_destructive: '#B91C1C',
  color_destructive_foreground: '#FFFFFF',
  color_border: '#E8DDD4',
  color_muted: '#F5F0EB',
  color_muted_foreground: '#8B7355',
  color_ring: '#8B5A2B',
  color_accent: '#C4A77D',
  color_accent_foreground: '#2C1810',
  color_card: '#FDFCF9',
  color_card_foreground: '#111111',
  color_input: '#E8DDD4',
};

const LEGACY_DARK_THEME_COLORS: Record<string, string> = {
  color_dark_primary: '#C4956A',
  color_dark_primary_foreground: '#141210',
  color_dark_secondary: '#1E1C18',
  color_dark_secondary_foreground: '#E8E0D4',
  color_dark_background: '#141210',
  color_dark_foreground: '#F0EDE8',
  color_dark_card: '#1A1714',
  color_dark_card_foreground: '#F0EDE8',
  color_dark_border: '#2E2822',
  color_dark_input: '#2E2822',
  color_dark_muted: '#1E1C18',
  color_dark_muted_foreground: '#9B8E7E',
  color_dark_accent: '#1E1C18',
  color_dark_accent_foreground: '#E8E0D4',
  color_dark_destructive: '#ef4444',
  color_dark_destructive_foreground: '#ffffff',
  color_dark_ring: '#C4956A',
};

function buildColorCase(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([key, value]) => `WHEN '${key}' THEN '${value}'`)
    .join('\n        ');
}

function buildKeyList(colors: Record<string, string>): string {
  return Object.keys(colors)
    .map((key) => `'${key}'`)
    .join(', ');
}

export class UpdateThemeColorsGrayscale1784300000000 implements MigrationInterface {
  name = 'UpdateThemeColorsGrayscale1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.updateColors(queryRunner, { ...LIGHT_THEME_COLORS, ...DARK_THEME_COLORS });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.updateColors(queryRunner, { ...LEGACY_LIGHT_THEME_COLORS, ...LEGACY_DARK_THEME_COLORS });
  }

  private async updateColors(queryRunner: QueryRunner, colors: Record<string, string>): Promise<void> {
    await queryRunner.query(`
      UPDATE \`site_settings\`
      SET
        \`value\` = CASE \`setting_key\`
          ${buildColorCase(colors)}
          ELSE \`value\`
        END,
        \`default_value\` = CASE \`setting_key\`
          ${buildColorCase(colors)}
          ELSE \`default_value\`
        END,
        \`value_en\` = NULL,
        \`value_ja\` = NULL,
        \`value_zh\` = NULL
      WHERE \`setting_key\` IN (${buildKeyList(colors)})
    `);
  }
}
