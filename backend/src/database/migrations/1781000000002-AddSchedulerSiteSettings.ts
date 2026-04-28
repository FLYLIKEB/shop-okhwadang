import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulerSiteSettings1781000000002 implements MigrationInterface {
  name = 'AddSchedulerSiteSettings1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
      VALUES
        ('scheduler_pending_cancel_hours', '24', 'scheduler', '미결제 주문 자동 취소 시간', 'number', NULL, '24', 100),
        ('scheduler_delivered_confirm_days', '7', 'scheduler', '배송 완료 후 구매확정까지 기간', 'number', NULL, '7', 101)
      ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`site_settings\` WHERE \`setting_key\` IN ('scheduler_pending_cancel_hours', 'scheduler_delivered_confirm_days')`);
  }
}