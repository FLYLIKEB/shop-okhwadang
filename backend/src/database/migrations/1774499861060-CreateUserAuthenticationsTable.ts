import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAuthenticationsTable1774499861060 implements MigrationInterface {
  name = 'CreateUserAuthenticationsTable1774499861060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`user_authentications\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`provider\` enum('kakao','google') NOT NULL, \`provider_id\` varchar(255) NOT NULL, \`access_token\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_user_auth_provider_provider_id\` (\`provider\`, \`provider_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_authentications\` ADD CONSTRAINT \`FK_user_authentications_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_authentications\` DROP FOREIGN KEY \`FK_user_authentications_user_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_user_auth_provider_provider_id\` ON \`user_authentications\``,
    );
    await queryRunner.query(`DROP TABLE \`user_authentications\``);
  }
}
