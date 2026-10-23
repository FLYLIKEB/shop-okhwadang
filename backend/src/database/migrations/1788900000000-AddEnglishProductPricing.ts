import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEnglishProductPricing1788900000000 implements MigrationInterface {
  private readonly columns = [
    ['products', 'price_usd', 2],
    ['products', 'sale_price_usd', 2],
    ['orders', 'pricing_krw_per_usd', 6],
    ['orders', 'total_usd', 2],
    ['order_items', 'price_usd', 2],
  ] as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name, scale] of this.columns) {
      if (!await queryRunner.hasColumn(table, name)) {
        await queryRunner.addColumn(table, new TableColumn({ name, type: 'decimal', precision: 12, scale, isNullable: true }));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name] of [...this.columns].reverse()) {
      if (await queryRunner.hasColumn(table, name)) await queryRunner.dropColumn(table, name);
    }
  }
}
