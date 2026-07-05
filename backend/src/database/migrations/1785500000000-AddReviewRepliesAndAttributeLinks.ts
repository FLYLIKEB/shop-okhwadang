import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewRepliesAndAttributeLinks1785500000000 implements MigrationInterface {
  name = 'AddReviewRepliesAndAttributeLinks1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, 'attribute_types', 'parent_id', '`parent_id` int NULL');
    await this.addColumnIfMissing(
      queryRunner,
      'attribute_types',
      'related_type_ids',
      '`related_type_ids` json NULL',
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'attribute_types',
      'fk_attribute_types_parent',
      `ALTER TABLE \`attribute_types\`
       ADD CONSTRAINT \`fk_attribute_types_parent\`
       FOREIGN KEY (\`parent_id\`) REFERENCES \`attribute_types\`(\`id\`)
       ON DELETE SET NULL`,
    );

    await this.addReviewReplyColumns(queryRunner, 'reviews');
    await this.addReviewReplyColumns(queryRunner, 'external_reviews');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumnIfExists(queryRunner, 'external_reviews', 'admin_replied_at');
    await this.dropColumnIfExists(queryRunner, 'external_reviews', 'admin_reply_author');
    await this.dropColumnIfExists(queryRunner, 'external_reviews', 'admin_reply_content');
    await this.dropColumnIfExists(queryRunner, 'reviews', 'admin_replied_at');
    await this.dropColumnIfExists(queryRunner, 'reviews', 'admin_reply_author');
    await this.dropColumnIfExists(queryRunner, 'reviews', 'admin_reply_content');
    await this.dropForeignKeyIfExists(queryRunner, 'attribute_types', 'fk_attribute_types_parent');
    await this.dropColumnIfExists(queryRunner, 'attribute_types', 'related_type_ids');
    await this.dropColumnIfExists(queryRunner, 'attribute_types', 'parent_id');
  }

  private async addReviewReplyColumns(queryRunner: QueryRunner, tableName: string): Promise<void> {
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

  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    if (await this.columnExists(queryRunner, tableName, columnName)) {
      await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    }
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    statement: string,
  ): Promise<void> {
    if (!(await this.foreignKeyExists(queryRunner, tableName, constraintName))) {
      await queryRunner.query(statement);
    }
  }

  private async dropForeignKeyIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    if (await this.foreignKeyExists(queryRunner, tableName, constraintName)) {
      await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
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

  private async foreignKeyExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<boolean> {
    const [row] = (await queryRunner.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = ?
         AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [tableName, constraintName],
    )) as Array<{ CONSTRAINT_NAME: string }>;
    return Boolean(row);
  }
}
