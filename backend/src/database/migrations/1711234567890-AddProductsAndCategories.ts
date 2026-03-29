import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsAndCategories1711234567890
  implements MigrationInterface
{
  name = 'AddProductsAndCategories1711234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`slug\` varchar(100) NOT NULL,
        \`parent_id\` bigint NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`image_url\` varchar(500) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT \`UQ_categories_slug\` UNIQUE (\`slug\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `CREATE INDEX \`IDX_categories_parent_id\` ON \`categories\` (\`parent_id\`)`,
    );

    await queryRunner.query(`
      ALTER TABLE \`categories\`
        ADD CONSTRAINT \`FK_categories_parent\`
        FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`category_id\` bigint NULL,
        \`name\` varchar(255) NOT NULL,
        \`slug\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`short_description\` varchar(500) NULL,
        \`price\` decimal(12,2) NOT NULL,
        \`sale_price\` decimal(12,2) NULL,
        \`stock\` int NOT NULL DEFAULT 0,
        \`sku\` varchar(100) NULL,
        \`status\` enum('draft','active','soldout','hidden') NOT NULL DEFAULT 'draft',
        \`is_featured\` tinyint NOT NULL DEFAULT 0,
        \`view_count\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT \`UQ_products_slug\` UNIQUE (\`slug\`),
        CONSTRAINT \`UQ_products_sku\` UNIQUE (\`sku\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(
      `CREATE INDEX \`IDX_products_category_id\` ON \`products\` (\`category_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_status\` ON \`products\` (\`status\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_products_is_featured\` ON \`products\` (\`is_featured\`)`,
    );
    await queryRunner.query(
      `CREATE FULLTEXT INDEX \`FT_products_name\` ON \`products\` (\`name\`)`,
    );

    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD CONSTRAINT \`FK_products_category\`
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`)
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_options\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`product_id\` bigint NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`value\` varchar(100) NOT NULL,
        \`price_adjustment\` decimal(10,2) NOT NULL DEFAULT 0,
        \`stock\` int NOT NULL DEFAULT 0,
        \`sort_order\` int NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`product_options\`
        ADD CONSTRAINT \`FK_product_options_product\`
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`)
        ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_images\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`product_id\` bigint NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`alt\` varchar(255) NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_thumbnail\` tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`product_images\`
        ADD CONSTRAINT \`FK_product_images_product\`
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`)
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`product_images\` DROP FOREIGN KEY \`FK_product_images_product\``,
    );
    await queryRunner.query(`DROP TABLE \`product_images\``);

    await queryRunner.query(
      `ALTER TABLE \`product_options\` DROP FOREIGN KEY \`FK_product_options_product\``,
    );
    await queryRunner.query(`DROP TABLE \`product_options\``);

    await queryRunner.query(
      `ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_products_category\``,
    );
    await queryRunner.query(`DROP INDEX \`FT_products_name\` ON \`products\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_products_is_featured\` ON \`products\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_products_status\` ON \`products\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_products_category_id\` ON \`products\``,
    );
    await queryRunner.query(`DROP TABLE \`products\``);

    await queryRunner.query(
      `ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_categories_parent\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_categories_parent_id\` ON \`categories\``,
    );
    await queryRunner.query(`DROP TABLE \`categories\``);
  }
}
