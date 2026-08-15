import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentProviderBinding1787100000000 implements MigrationInterface {
  name = 'AddPaymentProviderBinding1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;
    const columns = [
      ['provider_transaction_id', 'varchar(255) NULL'],
      ['provider_order_reference', 'varchar(255) NULL'],
      ['expected_provider_amount', 'decimal(12,2) NULL'],
      ['expected_provider_currency', 'varchar(8) NULL'],
      ['local_order_reference', 'varchar(255) NULL'],
    ] as const;
    for (const [name, definition] of columns) {
      if (!table.findColumnByName(name)) {
        await queryRunner.query(`ALTER TABLE \`payments\` ADD \`${name}\` ${definition}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;
    for (const name of ['local_order_reference', 'expected_provider_currency', 'expected_provider_amount', 'provider_order_reference', 'provider_transaction_id']) {
      if (table.findColumnByName(name)) {
        await queryRunner.query(`ALTER TABLE \`payments\` DROP COLUMN \`${name}\``);
      }
    }
  }
}
