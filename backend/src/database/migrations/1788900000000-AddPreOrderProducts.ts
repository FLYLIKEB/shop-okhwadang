import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPreOrderProducts1788900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['products', 'order_items']) {
      if (!(await queryRunner.hasColumn(table, 'is_pre_order'))) {
        await queryRunner.addColumn(table, new TableColumn({
          name: 'is_pre_order', type: 'tinyint', default: 0,
        }));
      }
      if (!(await queryRunner.hasColumn(table, 'pre_order_shipping_date'))) {
        await queryRunner.addColumn(table, new TableColumn({
          name: 'pre_order_shipping_date', type: 'date', isNullable: true,
        }));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['order_items', 'products']) {
      for (const column of ['pre_order_shipping_date', 'is_pre_order']) {
        if (await queryRunner.hasColumn(table, column)) {
          await queryRunner.dropColumn(table, column);
        }
      }
    }
  }
}
