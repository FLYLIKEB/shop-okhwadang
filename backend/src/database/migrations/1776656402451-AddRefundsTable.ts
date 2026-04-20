import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundsTable1776656402451 implements MigrationInterface {
  name = 'AddRefundsTable1776656402451';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`refunds\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`payment_id\` bigint NOT NULL,
        \`order_item_id\` bigint NULL,
        \`amount\` decimal(12,2) NOT NULL,
        \`reason\` varchar(500) NOT NULL,
        \`status\` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
        \`gateway_refund_id\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_refunds_payment_id\` (\`payment_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // FK: refunds.payment_id → payments.id
    const fkPayment = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'refunds'
        AND CONSTRAINT_NAME = 'FK_refunds_payment_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if ((fkPayment as unknown[]).length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`refunds\`
          ADD CONSTRAINT \`FK_refunds_payment_id\`
          FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\`(\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }

    // FK: refunds.order_item_id → order_items.id (nullable)
    const fkOrderItem = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'refunds'
        AND CONSTRAINT_NAME = 'FK_refunds_order_item_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if ((fkOrderItem as unknown[]).length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`refunds\`
          ADD CONSTRAINT \`FK_refunds_order_item_id\`
          FOREIGN KEY (\`order_item_id\`) REFERENCES \`order_items\`(\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK to order_items if exists
    const fkOrderItem = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'refunds'
        AND CONSTRAINT_NAME = 'FK_refunds_order_item_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if ((fkOrderItem as unknown[]).length > 0) {
      await queryRunner.query(`ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_refunds_order_item_id\``);
    }

    // Drop FK to payments if exists
    const fkPayment = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'refunds'
        AND CONSTRAINT_NAME = 'FK_refunds_payment_id'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    if ((fkPayment as unknown[]).length > 0) {
      await queryRunner.query(`ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_refunds_payment_id\``);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS \`refunds\``);
  }
}
