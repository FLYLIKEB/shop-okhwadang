import { MigrationInterface, QueryRunner } from 'typeorm';

const SETTING_LABELS: Record<string, string> = {
  color_primary: 'Primary color',
  color_primary_foreground: 'Primary text color',
  color_secondary_foreground: 'Secondary text color',
  color_secondary: 'Secondary color',
  color_background: 'Background color',
  color_foreground: 'Text color',
  color_destructive: 'Destructive color',
  color_border: 'Border color',
  color_destructive_foreground: 'Destructive text color',
  color_muted: 'Muted background color',
  color_muted_foreground: 'Muted text color',
  color_ring: 'Focus ring color',
  font_family_base: 'Base font family',
  color_accent: 'Accent color',
  font_size_base: 'Base font size',
  color_accent_foreground: 'Accent text color',
  font_weight_normal: 'Normal font weight',
  color_card: 'Card background color',
  font_weight_bold: 'Bold font weight',
  color_card_foreground: 'Card text color',
  line_height_base: 'Base line height',
  color_input: 'Input color',
  spacing_xs: 'Extra small spacing',
  spacing_sm: 'Small spacing',
  spacing_md: 'Medium spacing',
  spacing_lg: 'Large spacing',
  spacing_xl: 'Extra large spacing',
  radius_sm: 'Small corner radius',
  radius_md: 'Medium corner radius',
  radius_lg: 'Large corner radius',
  scheduler_pending_cancel_hours: 'Unpaid order cancellation delay (hours)',
  brand_name: 'Brand name',
  brand_tagline: 'Brand tagline',
  scheduler_delivered_confirm_days: 'Automatic purchase confirmation delay (days)',
  color_dark_primary: 'Dark mode primary color',
  footer_copyright: 'Footer copyright',
  color_dark_primary_foreground: 'Dark mode primary text color',
  logo_alt: 'Logo alternative text',
  color_dark_secondary: 'Dark mode secondary color',
  color_dark_secondary_foreground: 'Dark mode secondary text color',
  color_dark_background: 'Dark mode background color',
  color_dark_foreground: 'Dark mode text color',
  color_dark_card: 'Dark mode card background color',
  color_dark_card_foreground: 'Dark mode card text color',
  color_dark_border: 'Dark mode border color',
  color_dark_input: 'Dark mode input background color',
  color_dark_muted: 'Dark mode muted background color',
  color_dark_muted_foreground: 'Dark mode muted text color',
  color_dark_accent: 'Dark mode accent background color',
  color_dark_accent_foreground: 'Dark mode accent text color',
  color_dark_destructive: 'Dark mode destructive color',
  color_dark_destructive_foreground: 'Dark mode destructive text color',
  color_dark_ring: 'Dark mode focus ring color',
  review_point_reward: 'Review reward points',
  business_company_name: 'Company name',
  business_ceo: 'Representative',
  photo_review_bonus: 'Photo review bonus points',
  business_registration_number: 'Business registration number',
  business_mail_order_number: 'Online retail registration number',
  business_address: 'Address',
  business_phone: 'Phone',
  business_email: 'Email',
  business_hours: 'Business hours',
  business_privacy_officer: 'Privacy officer',
  business_lunch_time: 'Lunch break',
  business_info_url: 'Business information URL',
  business_holidays: 'Closed days',
  free_shipping_threshold: 'Free shipping threshold',
  shipping_base_fee: 'Base shipping fee',
  remote_area_surcharge: 'Remote area surcharge',
  mobile_bottom_nav_visible: 'Show bottom navigation',
};

const ANNOUNCEMENT = '아직 작업중인 쇼핑몰이며, 모든 것들은 더미 데이터입니다';
const ENGLISH_ANNOUNCEMENT = 'This store is still under development. All content is sample data.';
const BACKUP_TABLE = 'english_ui_backup_1788800000000';

export class EnglishUiLabels1788800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
      resource varchar(32) NOT NULL, record_id bigint NOT NULL,
      original_value text NULL, replacement_value text NOT NULL,
      PRIMARY KEY (resource, record_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    for (const [key, label] of Object.entries(SETTING_LABELS)) {
      await queryRunner.query(
        `INSERT IGNORE INTO ${BACKUP_TABLE} (resource, record_id, original_value, replacement_value)
         SELECT 'setting_label', id, label, ? FROM site_settings
         WHERE setting_key = ? AND label REGEXP '[가-힣]'`,
        [label.toUpperCase(), key],
      );
    }
    await queryRunner.query(`UPDATE site_settings AS settings
      JOIN ${BACKUP_TABLE} AS backup ON backup.record_id = settings.id AND backup.resource = 'setting_label'
      SET settings.label = backup.replacement_value
      WHERE BINARY settings.label = BINARY backup.original_value`);

    await queryRunner.query(
      `INSERT IGNORE INTO ${BACKUP_TABLE} (resource, record_id, original_value, replacement_value)
       SELECT 'announcement_en', id, message_en, ? FROM announcement_bars
       WHERE BINARY message = BINARY ? AND (message_en IS NULL OR TRIM(message_en) = '')`,
      [ENGLISH_ANNOUNCEMENT, ANNOUNCEMENT],
    );
    await queryRunner.query(
      `UPDATE announcement_bars AS announcement
       JOIN ${BACKUP_TABLE} AS backup ON backup.record_id = announcement.id AND backup.resource = 'announcement_en'
       SET announcement.message_en = backup.replacement_value
       WHERE BINARY announcement.message = BINARY ?
         AND (BINARY announcement.message_en <=> BINARY backup.original_value)`,
      [ANNOUNCEMENT],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE site_settings AS settings
      JOIN ${BACKUP_TABLE} AS backup ON backup.record_id = settings.id AND backup.resource = 'setting_label'
      SET settings.label = backup.original_value
      WHERE BINARY settings.label = BINARY backup.replacement_value`);
    await queryRunner.query(
      `UPDATE announcement_bars AS announcement
       JOIN ${BACKUP_TABLE} AS backup ON backup.record_id = announcement.id AND backup.resource = 'announcement_en'
       SET announcement.message_en = backup.original_value
       WHERE BINARY announcement.message = BINARY ?
         AND BINARY announcement.message_en = BINARY backup.replacement_value`,
      [ANNOUNCEMENT],
    );
  }
}
