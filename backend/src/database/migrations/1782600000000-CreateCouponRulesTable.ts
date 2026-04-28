import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponRulesTable1782600000000 implements MigrationInterface {
  name = 'CreateCouponRulesTable1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`coupon_rules\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`trigger\` enum('signup','first_purchase','birthday','tier_up') NOT NULL,
        \`coupon_template_id\` bigint NOT NULL,
        \`conditions_json\` json NULL,
        \`active\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_coupon_rules_trigger\` (\`trigger\`),
        INDEX \`IDX_coupon_rules_active\` (\`active\`),
        CONSTRAINT \`FK_coupon_rules_coupon_template\` FOREIGN KEY (\`coupon_template_id\`) REFERENCES \`coupons\` (\`id\`) ON DELETE CASCADE,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`coupon_rules\``);
  }
}
