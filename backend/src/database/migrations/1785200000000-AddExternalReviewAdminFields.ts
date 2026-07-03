import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalReviewAdminFields1785200000000 implements MigrationInterface {
  name = 'AddExternalReviewAdminFields1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      'review_type',
      '`review_type` varchar(40) NULL AFTER `external_product_id`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'media_assets',
      '`media_assets` json NULL AFTER `image_urls`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'helpful_count',
      '`helpful_count` int UNSIGNED NOT NULL DEFAULT 0 AFTER `reviewer_name_masked`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'source_display_status',
      '`source_display_status` varchar(40) NULL AFTER `helpful_count`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'is_best',
      '`is_best` tinyint NOT NULL DEFAULT 0 AFTER `is_visible`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'best_selected_at',
      '`best_selected_at` datetime NULL AFTER `is_best`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'related_review_external_id',
      '`related_review_external_id` varchar(128) NULL AFTER `best_selected_at`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'related_review_content',
      '`related_review_content` text NULL AFTER `related_review_external_id`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'order_no',
      '`order_no` varchar(128) NULL AFTER `related_review_content`',
    );
    await this.addColumnIfMissing(queryRunner, 'raw_data', '`raw_data` json NULL AFTER `order_no`');
    await this.addColumnIfMissing(
      queryRunner,
      'import_batch_id',
      '`import_batch_id` varchar(64) NULL AFTER `raw_data`',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'source_updated_at',
      '`source_updated_at` datetime NULL AFTER `reviewed_at`',
    );
    await this.addIndexIfMissing(
      queryRunner,
      'IDX_external_reviews_import_batch',
      'CREATE INDEX `IDX_external_reviews_import_batch` ON `external_reviews` (`import_batch_id`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(queryRunner, 'IDX_external_reviews_import_batch');
    await this.dropColumnIfExists(queryRunner, 'source_updated_at');
    await this.dropColumnIfExists(queryRunner, 'import_batch_id');
    await this.dropColumnIfExists(queryRunner, 'raw_data');
    await this.dropColumnIfExists(queryRunner, 'order_no');
    await this.dropColumnIfExists(queryRunner, 'related_review_content');
    await this.dropColumnIfExists(queryRunner, 'related_review_external_id');
    await this.dropColumnIfExists(queryRunner, 'best_selected_at');
    await this.dropColumnIfExists(queryRunner, 'is_best');
    await this.dropColumnIfExists(queryRunner, 'source_display_status');
    await this.dropColumnIfExists(queryRunner, 'helpful_count');
    await this.dropColumnIfExists(queryRunner, 'media_assets');
    await this.dropColumnIfExists(queryRunner, 'review_type');
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    columnName: string,
    definition: string,
  ): Promise<void> {
    const [row] = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_reviews' AND COLUMN_NAME = ?`,
      [columnName],
    )) as Array<{ COLUMN_NAME: string }>;
    if (!row) {
      await queryRunner.query(`ALTER TABLE \`external_reviews\` ADD COLUMN ${definition}`);
    }
  }

  private async dropColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
    const [row] = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_reviews' AND COLUMN_NAME = ?`,
      [columnName],
    )) as Array<{ COLUMN_NAME: string }>;
    if (row) {
      await queryRunner.query(`ALTER TABLE \`external_reviews\` DROP COLUMN \`${columnName}\``);
    }
  }

  private async addIndexIfMissing(
    queryRunner: QueryRunner,
    indexName: string,
    createSql: string,
  ): Promise<void> {
    const [row] = (await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_reviews' AND INDEX_NAME = ?`,
      [indexName],
    )) as Array<{ INDEX_NAME: string }>;
    if (!row) {
      await queryRunner.query(createSql);
    }
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, indexName: string): Promise<void> {
    const [row] = (await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'external_reviews' AND INDEX_NAME = ?`,
      [indexName],
    )) as Array<{ INDEX_NAME: string }>;
    if (row) {
      await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`external_reviews\``);
    }
  }
}
