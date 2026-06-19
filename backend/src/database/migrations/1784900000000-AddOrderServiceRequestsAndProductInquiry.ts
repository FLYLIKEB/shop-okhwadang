import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderServiceRequestsAndProductInquiry1784900000000 implements MigrationInterface {
  name = 'AddOrderServiceRequestsAndProductInquiry1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner, 'pages', 'policy_version'))) {
      await queryRunner.query(
        `ALTER TABLE \`pages\` ADD COLUMN \`policy_version\` varchar(50) NULL AFTER \`template\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'pages', 'policy_effective_date'))) {
      await queryRunner.query(
        `ALTER TABLE \`pages\` ADD COLUMN \`policy_effective_date\` date NULL AFTER \`policy_version\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'pages', 'policy_change_summary'))) {
      await queryRunner.query(
        `ALTER TABLE \`pages\` ADD COLUMN \`policy_change_summary\` longtext NULL AFTER \`policy_effective_date\``,
      );
    }
    if (!(await this.columnExists(queryRunner, 'pages', 'is_current_policy'))) {
      await queryRunner.query(
        `ALTER TABLE \`pages\` ADD COLUMN \`is_current_policy\` tinyint(1) NOT NULL DEFAULT 0 AFTER \`policy_change_summary\``,
      );
      await queryRunner.query(
        `UPDATE \`pages\` SET \`policy_version\` = 'v1.0', \`policy_effective_date\` = '2026-04-20', \`policy_change_summary\` = '최초 제정', \`is_current_policy\` = 1 WHERE \`slug\` IN ('terms','privacy','shipping','returns','shipping-returns')`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'inquiries', 'product_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`inquiries\` ADD COLUMN \`product_id\` bigint NULL AFTER \`user_id\``,
      );
      await queryRunner.query(
        `CREATE INDEX \`IDX_inquiries_product_id\` ON \`inquiries\` (\`product_id\`)`,
      );
    }
    if (!(await this.columnExists(queryRunner, 'inquiries', 'is_secret'))) {
      await queryRunner.query(
        `ALTER TABLE \`inquiries\` ADD COLUMN \`is_secret\` tinyint(1) NOT NULL DEFAULT 0 AFTER \`content\``,
      );
    }


    if (!(await this.tableExists(queryRunner, 'policy_consents'))) {
      await queryRunner.query(`
        CREATE TABLE \`policy_consents\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`user_id\` bigint NOT NULL,
          \`context\` enum('signup','checkout') NOT NULL,
          \`resource_type\` varchar(50) NULL,
          \`resource_id\` bigint NULL,
          \`policies\` json NOT NULL,
          \`marketing_consent\` tinyint(1) NOT NULL DEFAULT 0,
          \`consented_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX \`IDX_policy_consents_user\` (\`user_id\`),
          INDEX \`IDX_policy_consents_resource\` (\`context\`, \`resource_type\`, \`resource_id\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_policy_consents_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }

    if (!(await this.tableExists(queryRunner, 'order_service_requests'))) {
      await queryRunner.query(`
        CREATE TABLE \`order_service_requests\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`order_id\` bigint NOT NULL,
          \`user_id\` bigint NOT NULL,
          \`type\` enum('cancel','return','exchange','refund') NOT NULL,
          \`status\` enum('requested','approved','rejected','completed') NOT NULL DEFAULT 'requested',
          \`reason\` varchar(100) NOT NULL,
          \`detail\` longtext NULL,
          \`image_urls\` json NULL,
          \`use_shipping_address\` tinyint(1) NOT NULL DEFAULT 1,
          \`pickup_name\` varchar(100) NULL,
          \`pickup_phone\` varchar(20) NULL,
          \`pickup_zipcode\` varchar(10) NULL,
          \`pickup_address\` varchar(255) NULL,
          \`pickup_address_detail\` varchar(255) NULL,
          \`admin_note\` longtext NULL,
          \`processed_at\` datetime NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_osr_order_id\` (\`order_id\`),
          INDEX \`IDX_osr_user_id\` (\`user_id\`),
          INDEX \`IDX_osr_type_status\` (\`type\`, \`status\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(
        `ALTER TABLE \`order_service_requests\` ADD CONSTRAINT \`FK_osr_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `ALTER TABLE \`order_service_requests\` ADD CONSTRAINT \`FK_osr_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    if (await this.tableExists(queryRunner, 'policy_consents')) {
      await queryRunner.query(`DROP TABLE \`policy_consents\``);
    }

    if (await this.tableExists(queryRunner, 'order_service_requests')) {
      await queryRunner.query(
        `ALTER TABLE \`order_service_requests\` DROP FOREIGN KEY \`FK_osr_user\``,
      );
      await queryRunner.query(
        `ALTER TABLE \`order_service_requests\` DROP FOREIGN KEY \`FK_osr_order\``,
      );
      await queryRunner.query(`DROP TABLE \`order_service_requests\``);
    }
    if (await this.columnExists(queryRunner, 'pages', 'is_current_policy')) {
      await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`is_current_policy\``);
    }
    if (await this.columnExists(queryRunner, 'pages', 'policy_change_summary')) {
      await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`policy_change_summary\``);
    }
    if (await this.columnExists(queryRunner, 'pages', 'policy_effective_date')) {
      await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`policy_effective_date\``);
    }
    if (await this.columnExists(queryRunner, 'pages', 'policy_version')) {
      await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`policy_version\``);
    }
    if (await this.columnExists(queryRunner, 'inquiries', 'is_secret')) {
      await queryRunner.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`is_secret\``);
    }
    if (await this.columnExists(queryRunner, 'inquiries', 'product_id')) {
      await queryRunner.query(`DROP INDEX \`IDX_inquiries_product_id\` ON \`inquiries\``);
      await queryRunner.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`product_id\``);
    }
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName],
    )) as Array<{ cnt: string }>;
    return Number(rows[0]?.cnt ?? 0) > 0;
  }
}
