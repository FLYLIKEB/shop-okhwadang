import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenBlacklistTable1778500000000 implements MigrationInterface {
  name = 'CreateTokenBlacklistTable1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`token_blacklist\` (\`jti\` varchar(36) NOT NULL, \`user_id\` bigint NOT NULL, \`expires_at\` datetime NOT NULL, \`reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_token_blacklist_user_id\` (\`user_id\`), INDEX \`IDX_token_blacklist_expires_at\` (\`expires_at\`), PRIMARY KEY (\`jti\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`token_blacklist\` ADD CONSTRAINT \`FK_token_blacklist_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`token_blacklist\` DROP FOREIGN KEY \`FK_token_blacklist_user_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_token_blacklist_expires_at\` ON \`token_blacklist\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_token_blacklist_user_id\` ON \`token_blacklist\``,
    );
    await queryRunner.query(`DROP TABLE \`token_blacklist\``);
  }
}