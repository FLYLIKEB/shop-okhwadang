import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingPolicySettings1782400000001 implements MigrationInterface {
  name = 'AddShippingPolicySettings1782400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`site_settings\` (\`setting_key\`, \`value\`, \`group\`, \`label\`, \`input_type\`, \`options\`, \`default_value\`, \`sort_order\`)
       VALUES
         ('free_shipping_threshold', '50000', 'shipping', '무료배송 임계 금액', 'number', NULL, '50000', 300),
         ('shipping_base_fee', '3000', 'shipping', '기본 배송비', 'number', NULL, '3000', 301),
         ('remote_area_surcharge', '3000', 'shipping', '도서산간 추가 배송비', 'number', NULL, '3000', 302)
       ON DUPLICATE KEY UPDATE
         \`value\` = VALUES(\`value\`),
         \`default_value\` = VALUES(\`default_value\`),
         \`group\` = VALUES(\`group\`),
         \`label\` = VALUES(\`label\`),
         \`input_type\` = VALUES(\`input_type\`),
         \`options\` = VALUES(\`options\`),
         \`sort_order\` = VALUES(\`sort_order\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`site_settings\` WHERE \`setting_key\` IN ('free_shipping_threshold', 'shipping_base_fee', 'remote_area_surcharge')`,
    );
  }
}
