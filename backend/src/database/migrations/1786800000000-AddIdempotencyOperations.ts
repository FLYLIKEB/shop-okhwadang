import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyOperations1786800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE IF NOT EXISTS `idempotency_operations` (`id` int NOT NULL AUTO_INCREMENT, `scope` varchar(255) NOT NULL, `operation` varchar(100) NOT NULL, `key` varchar(255) NOT NULL, `fingerprint` varchar(64) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'completed', `leaseOwner` varchar(64) NULL, `leaseExpiresAt` datetime NULL, `result` json NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), UNIQUE KEY `IDX_idempotency_operations_scope_operation_key` (`scope`, `operation`, `key`)) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `idempotency_operations`');
  }
}
