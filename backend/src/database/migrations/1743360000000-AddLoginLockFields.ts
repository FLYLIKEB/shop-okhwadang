import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginLockFields1743360000000 implements MigrationInterface {
  name = 'AddLoginLockFields1743360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`failed_login_attempts\` int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`locked_until\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`locked_until\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`failed_login_attempts\``);
  }
}
