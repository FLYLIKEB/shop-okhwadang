import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1711100000000 implements MigrationInterface {
  name = 'CreateUsersTable1711100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`users\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NULL, \`name\` varchar(100) NOT NULL, \`phone\` varchar(20) NULL, \`role\` enum ('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user', \`is_active\` tinyint NOT NULL DEFAULT 1, \`refresh_token\` varchar(500) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_ace513fa30d485cfd25c11a9e4\` (\`role\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ace513fa30d485cfd25c11a9e4\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
