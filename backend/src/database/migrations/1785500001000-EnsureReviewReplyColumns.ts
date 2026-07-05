import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureReviewReplyColumns1785500001000 implements MigrationInterface {
  name = 'EnsureReviewReplyColumns1785500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addReplyColumns(queryRunner, 'reviews');
    await this.addReplyColumns(queryRunner, 'external_reviews');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Forward-only safety net. The original 1785500000000 migration owns these columns;
    // this migration only guarantees their existence when older environments missed them.
    void queryRunner;
  }

  private async addReplyColumns(queryRunner: QueryRunner, tableName: string): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      tableName,
      'admin_reply_content',
      '`admin_reply_content` text NULL',
    );
    await this.addColumnIfMissing(
      queryRunner,
      tableName,
      'admin_reply_author',
      '`admin_reply_author` varchar(100) NULL',
    );
    await this.addColumnIfMissing(
      queryRunner,
      tableName,
      'admin_replied_at',
      '`admin_replied_at` datetime NULL',
    );
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    definition: string,
  ): Promise<void> {
    if (!(await this.columnExists(queryRunner, tableName, columnName))) {
      await queryRunner.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const [row] = (await queryRunner.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [tableName, columnName],
    )) as Array<{ COLUMN_NAME: string }>;
    return Boolean(row);
  }
}
