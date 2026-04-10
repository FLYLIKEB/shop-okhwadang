import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorToDynamicAttributes1776500000000 implements MigrationInterface {
  name = 'RefactorToDynamicAttributes1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create attribute_types table
    await queryRunner.query(`
      CREATE TABLE \`attribute_types\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(50) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`name_ko\` VARCHAR(100) NULL,
        \`name_en\` VARCHAR(100) NULL,
        \`name_ja\` VARCHAR(100) NULL,
        \`name_zh\` VARCHAR(100) NULL,
        \`input_type\` ENUM('text', 'select', 'range') NOT NULL DEFAULT 'text',
        \`is_filterable\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`is_searchable\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`valid_values\` JSON NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_attribute_types_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Create product_attributes table
    await queryRunner.query(`
      CREATE TABLE \`product_attributes\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT NOT NULL,
        \`attribute_type_id\` INT NOT NULL,
        \`value\` VARCHAR(255) NOT NULL,
        \`display_value\` VARCHAR(255) NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_product_attributes_type_value\` (\`attribute_type_id\`, \`value\`),
        UNIQUE INDEX \`IDX_product_attributes_product_type\` (\`product_id\`, \`attribute_type_id\`),
        CONSTRAINT \`FK_product_attributes_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_product_attributes_type\` FOREIGN KEY (\`attribute_type_id\`) REFERENCES \`attribute_types\`(\`id\`) ON DELETE CASCADE,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Insert default attribute types for the tea shop
    await queryRunner.query(`
      INSERT INTO \`attribute_types\` (\`code\`, \`name\`, \`name_ko\`, \`input_type\`, \`is_filterable\`, \`is_searchable\`, \`valid_values\`, \`sort_order\`) VALUES
      ('clay_type', 'Clay Type', '니료', 'select', TRUE, FALSE, '["zhuni","zisha","duanni","heini","qinghuini"]', 1),
      ('teapot_shape', 'Shape', '모양', 'select', TRUE, FALSE, '["zhuxing","shipiao","xishi","bianping"]', 2)
    `);

    // 4. Drop old clay_type and teapot_shape columns from products
    await queryRunner.query(`
      ALTER TABLE \`products\`
        DROP INDEX \`IDX_products_teapot_shape\`,
        DROP INDEX \`IDX_products_clay_type\`,
        DROP COLUMN \`teapot_shape\`,
        DROP COLUMN \`clay_type\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Add back clay_type and teapot_shape columns
    await queryRunner.query(`
      ALTER TABLE \`products\`
        ADD COLUMN \`clay_type\` VARCHAR(50) NULL AFTER \`view_count\`,
        ADD COLUMN \`teapot_shape\` VARCHAR(50) NULL AFTER \`clay_type\`,
        ADD INDEX \`IDX_products_clay_type\` (\`clay_type\`),
        ADD INDEX \`IDX_products_teapot_shape\` (\`teapot_shape\`)
    `);

    // 2. Drop product_attributes table
    await queryRunner.query(`DROP TABLE IF EXISTS \`product_attributes\``);

    // 3. Drop attribute_types table
    await queryRunner.query(`DROP TABLE IF EXISTS \`attribute_types\``);
  }
}
