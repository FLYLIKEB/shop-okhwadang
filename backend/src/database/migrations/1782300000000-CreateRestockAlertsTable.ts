import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRestockAlertsTable1782300000000 implements MigrationInterface {
  name = 'CreateRestockAlertsTable1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [table] = await queryRunner.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restock_alerts'
    `);

    if (!table) {
      await queryRunner.query(`
        CREATE TABLE \`restock_alerts\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`user_id\` bigint NOT NULL,
          \`product_id\` bigint NOT NULL,
          \`product_option_id\` bigint NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`notified_at\` datetime NULL,
          INDEX \`IDX_restock_alerts_user_product\` (\`user_id\`, \`product_id\`),
          INDEX \`IDX_restock_alerts_product_notified\` (\`product_id\`, \`notified_at\`),
          INDEX \`IDX_restock_alerts_option_notified\` (\`product_option_id\`, \`notified_at\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_restock_alerts_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
          CONSTRAINT \`FK_restock_alerts_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
          CONSTRAINT \`FK_restock_alerts_product_option\` FOREIGN KEY (\`product_option_id\`) REFERENCES \`product_options\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [table] = await queryRunner.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restock_alerts'
    `);

    if (table) {
      await queryRunner.query('DROP TABLE `restock_alerts`');
    }
  }
}
