import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationFields1780000000000 implements MigrationInterface {
  name = 'AddEmailVerificationFields1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`is_email_verified\` tinyint(1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN \`email_verified_at\` datetime NULL AFTER \`is_email_verified\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email_verified_at\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_email_verified\``);
  }
}