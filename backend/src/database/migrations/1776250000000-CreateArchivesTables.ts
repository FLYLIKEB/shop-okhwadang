import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArchivesTables1776250000000 implements MigrationInterface {
  name = 'CreateArchivesTables1776250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`nilo_types\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`nameKo\` VARCHAR(100) NOT NULL,
        \`color\` VARCHAR(7) NOT NULL,
        \`region\` VARCHAR(200) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`characteristics\` JSON NOT NULL,
        \`product_url\` VARCHAR(500) NOT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`process_steps\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`step\` INT NOT NULL,
        \`title\` VARCHAR(100) NOT NULL,
        \`description\` VARCHAR(200) NOT NULL,
        \`detail\` TEXT NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`artists\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`title\` VARCHAR(100) NOT NULL,
        \`region\` VARCHAR(100) NOT NULL,
        \`story\` TEXT NOT NULL,
        \`specialty\` VARCHAR(200) NOT NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`product_url\` VARCHAR(500) NOT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`artists\``);
    await queryRunner.query(`DROP TABLE \`process_steps\``);
    await queryRunner.query(`DROP TABLE \`nilo_types\``);
  }
}
