import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokensTable1778400000001 implements MigrationInterface {
  name = 'CreatePasswordResetTokensTable1778400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`password_reset_tokens\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`token_hash\` varchar(64) NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_password_reset_tokens_token_hash\` (\`token_hash\`), INDEX \`IDX_password_reset_tokens_user_id\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` ADD CONSTRAINT \`FK_password_reset_tokens_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_password_reset_tokens_user_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_password_reset_tokens_user_id\` ON \`password_reset_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_password_reset_tokens_token_hash\` ON \`password_reset_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`password_reset_tokens\``);
  }
}
