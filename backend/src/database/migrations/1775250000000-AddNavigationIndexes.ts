import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNavigationIndexes1775250000000 implements MigrationInterface {
  name = 'AddNavigationIndexes1775250000000';

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
      await queryRunner.query(
        `CREATE INDEX \`${indexName}\` ON \`${table}\` (\`${column}\`)`,
      );
    }
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    // Index on group column for filtering active navigation items by group
    await this.createIndexIfNotExists(
      queryRunner,
      'navigation_items',
      'IDX_navigation_items_group',
      'group',
    );

    // Index on parent_id for tree traversal and depth validation
    await this.createIndexIfNotExists(
      queryRunner,
      'navigation_items',
      'IDX_navigation_items_parent_id',
      'parent_id',
    );

    // Composite index for the common query pattern: find active items by group
    await this.createIndexIfNotExists(
      queryRunner,
      'navigation_items',
      'IDX_navigation_items_group_is_active',
      'is_active',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_navigation_items_group',
      'IDX_navigation_items_parent_id',
      'IDX_navigation_items_group_is_active',
    ];

    for (const indexName of indexes) {
      if (await this.indexExists(queryRunner, 'navigation_items', indexName)) {
        await queryRunner.query(
          `DROP INDEX \`${indexName}\` ON \`navigation_items\``,
        );
      }
    }
  }
}