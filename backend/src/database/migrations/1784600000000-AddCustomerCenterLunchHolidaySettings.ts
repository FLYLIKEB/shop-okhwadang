import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerCenterLunchHolidaySettings1784600000000 implements MigrationInterface {
  name = 'AddCustomerCenterLunchHolidaySettings1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`value_en\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('business_lunch_time', '점심시간 12:00 - 13:00', 'Lunch break 12:00 - 13:00', 'business_info', '점심시간', 'text', NULL, '점심시간 12:00 - 13:00', 208),
        ('business_holidays', '주말·공휴일 휴무', 'Closed on weekends & holidays', 'business_info', '휴무일', 'text', NULL, '주말·공휴일 휴무', 209)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`site_settings\`
      WHERE \`setting_key\` IN ('business_lunch_time', 'business_holidays')
    `);
  }
}
