import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateShippingAddInTransit1774515000000 implements MigrationInterface {
  name = 'UpdateShippingAddInTransit1774515000000';

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return !!row;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add shipped_at column if not exists
    if (!(await this.columnExists(queryRunner, 'shipping', 'shipped_at'))) {
      await queryRunner.query(
        `ALTER TABLE \`shipping\` ADD COLUMN \`shipped_at\` datetime NULL AFTER \`status\``,
      );
    }

    // Add delivered_at column if not exists
    if (!(await this.columnExists(queryRunner, 'shipping', 'delivered_at'))) {
      await queryRunner.query(
        `ALTER TABLE \`shipping\` ADD COLUMN \`delivered_at\` datetime NULL AFTER \`shipped_at\``,
      );
    }

    // Modify status enum to include 'in_transit'
    await queryRunner.query(
      `ALTER TABLE \`shipping\` MODIFY COLUMN \`status\`
       ENUM('payment_confirmed','preparing','shipped','in_transit','delivered','failed')
       NOT NULL DEFAULT 'payment_confirmed'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove in_transit from enum (revert to original)
    await queryRunner.query(
      `ALTER TABLE \`shipping\` MODIFY COLUMN \`status\`
       ENUM('payment_confirmed','preparing','shipped','delivered','failed')
       NOT NULL DEFAULT 'payment_confirmed'`,
    );

    if (await this.columnExists(queryRunner, 'shipping', 'delivered_at')) {
      await queryRunner.query(`ALTER TABLE \`shipping\` DROP COLUMN \`delivered_at\``);
    }

    if (await this.columnExists(queryRunner, 'shipping', 'shipped_at')) {
      await queryRunner.query(`ALTER TABLE \`shipping\` DROP COLUMN \`shipped_at\``);
    }
  }
}
