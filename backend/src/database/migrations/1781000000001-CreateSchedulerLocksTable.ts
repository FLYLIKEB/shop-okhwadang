import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedulerLocksTable1781000000001 implements MigrationInterface {
  name = 'CreateSchedulerLocksTable1781000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`scheduler_locks\` (
        \`lock_name\` varchar(100) NOT NULL,
        \`instance_id\` varchar(100) NOT NULL,
        \`acquired_at\` datetime NOT NULL,
        \`expires_at\` datetime NOT NULL,
        PRIMARY KEY (\`lock_name\`)
      ) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`scheduler_locks\``);
  }
}