import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponsTable1774900000000 implements MigrationInterface {
  name = 'CreateCouponsTable1774900000000';

  private async dropFkIfExists(queryRunner: QueryRunner, table: string, fkName: string): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [table, fkName],
    );
    if (row) await queryRunner.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, table: string, indexName: string): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, indexName],
    );
    if (row) await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${table}\``);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`coupons\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`code\` varchar(50) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`type\` enum('percentage','fixed') NOT NULL,
        \`value\` decimal(12,2) NOT NULL,
        \`min_order_amount\` decimal(12,2) NOT NULL DEFAULT '0.00',
        \`max_discount\` decimal(12,2) NULL,
        \`total_quantity\` int NULL,
        \`issued_count\` int NOT NULL DEFAULT '0',
        \`starts_at\` datetime NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_coupons_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_coupons\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`coupon_id\` bigint NOT NULL,
        \`status\` enum('available','used','expired') NOT NULL DEFAULT 'available',
        \`used_at\` datetime NULL,
        \`order_id\` bigint NULL,
        \`issued_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_user_coupon\` (\`user_id\`, \`coupon_id\`),
        KEY \`FK_user_coupons_user\` (\`user_id\`),
        KEY \`FK_user_coupons_coupon\` (\`coupon_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dropFkIfExists(queryRunner, 'user_coupons', 'FK_user_coupons_user');
    await this.dropFkIfExists(queryRunner, 'user_coupons', 'FK_user_coupons_coupon');
    await queryRunner.query(`
      ALTER TABLE \`user_coupons\`
        ADD CONSTRAINT \`FK_user_coupons_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_user_coupons_coupon\` FOREIGN KEY (\`coupon_id\`) REFERENCES \`coupons\` (\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`point_history\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`type\` enum('earn','spend','expire','admin_adjust') NOT NULL,
        \`amount\` int NOT NULL,
        \`balance\` int NOT NULL,
        \`description\` varchar(255) NULL,
        \`order_id\` bigint NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_point_history_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dropFkIfExists(queryRunner, 'point_history', 'FK_point_history_user');
    await queryRunner.query(`
      ALTER TABLE \`point_history\`
        ADD CONSTRAINT \`FK_point_history_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`point_history\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_coupons\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`coupons\``);
  }
}
