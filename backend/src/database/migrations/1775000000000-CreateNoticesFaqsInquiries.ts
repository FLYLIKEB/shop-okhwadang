import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNoticesFaqsInquiries1775000000000 implements MigrationInterface {
  name = 'CreateNoticesFaqsInquiries1775000000000';

  private async dropFkIfExists(queryRunner: QueryRunner, table: string, fkName: string): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [table, fkName],
    );
    if (row) await queryRunner.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notices\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`content\` longtext NOT NULL,
        \`is_pinned\` tinyint(1) NOT NULL DEFAULT '0',
        \`is_published\` tinyint(1) NOT NULL DEFAULT '1',
        \`view_count\` int NOT NULL DEFAULT '0',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`faqs\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`category\` varchar(50) NOT NULL,
        \`question\` varchar(500) NOT NULL,
        \`answer\` longtext NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT '0',
        \`is_published\` tinyint(1) NOT NULL DEFAULT '1',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`inquiries\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`type\` enum('상품','배송','결제','교환/반품','기타') NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`content\` longtext NOT NULL,
        \`status\` enum('pending','answered') NOT NULL DEFAULT 'pending',
        \`answer\` longtext NULL,
        \`answered_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_inquiries_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dropFkIfExists(queryRunner, 'inquiries', 'FK_inquiries_user');
    await queryRunner.query(`
      ALTER TABLE \`inquiries\`
        ADD CONSTRAINT \`FK_inquiries_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`inquiries\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`faqs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`notices\``);
  }
}
