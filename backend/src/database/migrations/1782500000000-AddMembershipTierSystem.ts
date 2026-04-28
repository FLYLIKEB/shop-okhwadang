import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipTierSystem1782500000000 implements MigrationInterface {
  name = 'AddMembershipTierSystem1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create membership_tiers table
    await queryRunner.query(`
      CREATE TABLE \`membership_tiers\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(50) NOT NULL,
        \`min_amount\` decimal(14,2) NOT NULL DEFAULT '0.00',
        \`point_rate\` decimal(5,2) NOT NULL DEFAULT '1.00',
        \`benefits_json\` json NULL,
        \`sort_order\` int NOT NULL DEFAULT '0',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_membership_tiers_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed initial tier data
    await queryRunner.query(`
      INSERT INTO \`membership_tiers\` (\`name\`, \`min_amount\`, \`point_rate\`, \`benefits_json\`, \`sort_order\`)
      VALUES
        ('Bronze', 0,       1.00, '{"description": "기본 회원"}',                    1),
        ('Silver', 300000,  1.50, '{"description": "실버 회원", "welcomeCoupon": true}', 2),
        ('Gold',   700000,  2.00, '{"description": "골드 회원", "welcomeCoupon": true}', 3),
        ('VIP',    1500000, 3.00, '{"description": "VIP 회원", "welcomeCoupon": true}',  4)
    `);

    // Add tier columns to users table
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`tier\` varchar(50) NOT NULL DEFAULT 'Bronze' AFTER \`role\`,
        ADD COLUMN \`tier_accumulated_amount\` decimal(14,2) NOT NULL DEFAULT '0.00' AFTER \`tier\`,
        ADD COLUMN \`tier_evaluated_at\` datetime NULL AFTER \`tier_accumulated_amount\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`tier_evaluated_at\`,
        DROP COLUMN \`tier_accumulated_amount\`,
        DROP COLUMN \`tier\`
    `);

    await queryRunner.query(`DROP TABLE \`membership_tiers\``);
  }
}
