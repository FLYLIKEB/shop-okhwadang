import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductNameFulltextIndex1774510727813 implements MigrationInterface {
  private async indexExists(queryRunner: QueryRunner, table: string, indexName: string): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, indexName],
    );
    return !!row;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.indexExists(queryRunner, 'products', 'IDX_product_name_fulltext'))) {
      await queryRunner.query(
        `ALTER TABLE \`products\` ADD FULLTEXT INDEX \`IDX_product_name_fulltext\` (\`name\`) WITH PARSER ngram`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.indexExists(queryRunner, 'products', 'IDX_product_name_fulltext')) {
      await queryRunner.query(
        `ALTER TABLE \`products\` DROP INDEX \`IDX_product_name_fulltext\``,
      );
    }
  }
}
