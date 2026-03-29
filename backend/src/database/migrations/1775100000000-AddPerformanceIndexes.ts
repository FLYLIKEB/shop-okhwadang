import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1775100000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1775100000000';

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       LIMIT 1`,
      [table, column],
    );
    return !!row;
  }

  private async indexExists(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
  ): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, indexName],
    );
    return !!row;
  }

  private async createIndexIfNotExists(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
    column: string,
  ): Promise<void> {
    if (!(await this.indexExists(queryRunner, table, indexName))) {
      // 컬럼이 스키마에 없을 수 있으므로(이전 마이그레이션/환경차),
      // 인덱스 생성 전에 존재 여부를 확인한다.
      if (!(await this.columnExists(queryRunner, table, column))) return;
      await queryRunner.query(
        `CREATE INDEX \`${indexName}\` ON \`${table}\` (\`${column}\`)`,
      );
    }
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfNotExists(
      queryRunner,
      'products',
      'IDX_products_category_id',
      'category_id',
    );
    await this.createIndexIfNotExists(
      queryRunner,
      'products',
      'IDX_products_status',
      'status',
    );
    await this.createIndexIfNotExists(
      queryRunner,
      'products',
      'IDX_products_is_active',
      'is_active',
    );
    await this.createIndexIfNotExists(
      queryRunner,
      'products',
      'IDX_products_created_at',
      'created_at',
    );
    await this.createIndexIfNotExists(
      queryRunner,
      'orders',
      'IDX_orders_user_id',
      'user_id',
    );
    await this.createIndexIfNotExists(
      queryRunner,
      'orders',
      'IDX_orders_status',
      'status',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const indexes: [string, string][] = [
      ['products', 'IDX_products_category_id'],
      ['products', 'IDX_products_status'],
      ['products', 'IDX_products_is_active'],
      ['products', 'IDX_products_created_at'],
      ['orders', 'IDX_orders_user_id'],
      ['orders', 'IDX_orders_status'],
    ];

    for (const [table, indexName] of indexes) {
      if (await this.indexExists(queryRunner, table, indexName)) {
        await queryRunner.query(
          `DROP INDEX \`${indexName}\` ON \`${table}\``,
        );
      }
    }
  }
}
