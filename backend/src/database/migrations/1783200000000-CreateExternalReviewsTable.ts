import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExternalReviewsTable1783200000000 implements MigrationInterface {
  name = 'CreateExternalReviewsTable1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`external_reviews\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`product_id\` bigint NOT NULL,
        \`source\` varchar(32) NOT NULL DEFAULT 'smartstore',
        \`external_review_id\` varchar(128) NOT NULL,
        \`external_product_id\` varchar(128) NULL,
        \`rating\` tinyint UNSIGNED NOT NULL,
        \`content\` text NULL,
        \`image_urls\` json NULL,
        \`reviewer_name_masked\` varchar(80) NOT NULL DEFAULT '스마트스토어 구매자',
        \`is_visible\` tinyint NOT NULL DEFAULT 1,
        \`reviewed_at\` datetime NOT NULL,
        \`last_synced_at\` datetime NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_external_reviews_source_review\` (\`source\`, \`external_review_id\`),
        INDEX \`IDX_external_reviews_product_id\` (\`product_id\`),
        CONSTRAINT \`FK_external_reviews_product_id\`
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `external_reviews`');
  }
}
