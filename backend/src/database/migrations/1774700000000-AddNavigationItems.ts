import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNavigationItems1774700000000 implements MigrationInterface {
  name = 'AddNavigationItems1774700000000';

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

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`navigation_items\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`group\` enum('gnb', 'sidebar', 'footer') NOT NULL,
        \`label\` varchar(100) NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`parent_id\` bigint NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await this.dropFkIfExists(queryRunner, 'navigation_items', 'FK_navigation_items_parent_id');
    await queryRunner.query(`
      ALTER TABLE \`navigation_items\`
      ADD CONSTRAINT \`FK_navigation_items_parent_id\`
      FOREIGN KEY (\`parent_id\`) REFERENCES \`navigation_items\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropFkIfExists(queryRunner, 'navigation_items', 'FK_navigation_items_parent_id');
    await queryRunner.query(`DROP TABLE IF EXISTS \`navigation_items\``);
  }
}
