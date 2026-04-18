import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationTokensTable1780000000001 implements MigrationInterface {
  name = 'CreateVerificationTokensTable1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`verification_tokens\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`token_hash\` varchar(64) NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_verification_tokens_token_hash\` (\`token_hash\`), INDEX \`IDX_verification_tokens_user_id\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`verification_tokens\` ADD CONSTRAINT \`FK_verification_tokens_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`verification_tokens\` DROP FOREIGN KEY \`FK_verification_tokens_user_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_verification_tokens_user_id\` ON \`verification_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_verification_tokens_token_hash\` ON \`verification_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`verification_tokens\``);
  }
}