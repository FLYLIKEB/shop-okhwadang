import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RepairIdempotencyOperationLeaseColumns1787800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'idempotency_operations';

    if (!(await queryRunner.hasColumn(tableName, 'leaseOwner'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'leaseOwner',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tableName, 'leaseExpiresAt'))) {
      await queryRunner.addColumn(
        tableName,
        new TableColumn({
          name: 'leaseExpiresAt',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'idempotency_operations';

    if (await queryRunner.hasColumn(tableName, 'leaseExpiresAt')) {
      await queryRunner.dropColumn(tableName, 'leaseExpiresAt');
    }

    if (await queryRunner.hasColumn(tableName, 'leaseOwner')) {
      await queryRunner.dropColumn(tableName, 'leaseOwner');
    }
  }
}
