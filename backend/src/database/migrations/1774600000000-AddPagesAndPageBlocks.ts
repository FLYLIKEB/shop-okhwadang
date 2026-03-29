import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPagesAndPageBlocks1774600000000 implements MigrationInterface {
  name = 'AddPagesAndPageBlocks1774600000000';

  private async dropFkIfExists(
    queryRunner: QueryRunner,
    table: string,
    fkName: string,
  ): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [table, fkName],
    );
    if (row)
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``,
      );
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
  ): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [table, indexName],
    );
    if (row)
      await queryRunner.query(
        `DROP INDEX \`${indexName}\` ON \`${table}\``,
      );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`pages\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`slug\` varchar(100) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`template\` varchar(100) NOT NULL DEFAULT 'default',
        \`is_published\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_pages_slug\` (\`slug\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`page_blocks\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`page_id\` bigint NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`content\` json NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_visible\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await this.dropFkIfExists(queryRunner, 'page_blocks', 'FK_page_blocks_page_id');
    await queryRunner.query(`
      ALTER TABLE \`page_blocks\`
      ADD CONSTRAINT \`FK_page_blocks_page_id\`
      FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropFkIfExists(queryRunner, 'page_blocks', 'FK_page_blocks_page_id');
    await queryRunner.query(`DROP TABLE IF EXISTS \`page_blocks\``);
    await this.dropIndexIfExists(queryRunner, 'pages', 'IDX_pages_slug');
    await queryRunner.query(`DROP TABLE IF EXISTS \`pages\``);
  }
}
