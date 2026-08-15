import { QueryRunner } from 'typeorm';
import { AddIdempotencyOperations1786800000000 } from '../migrations/1786800000000-AddIdempotencyOperations';

describe('idempotency operations migration', () => {
  it('uses idempotent table creation and removal with the scoped-key uniqueness constraint', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddIdempotencyOperations1786800000000();
    await migration.up({ query } as unknown as QueryRunner);
    await migration.down({ query } as unknown as QueryRunner);
    expect(query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS `idempotency_operations`');
    expect(query.mock.calls[0][0]).toContain('UNIQUE KEY `IDX_idempotency_operations_scope_operation_key` (`scope`, `operation`, `key`)');
    expect(query.mock.calls[1][0]).toBe('DROP TABLE IF EXISTS `idempotency_operations`');
  });
});
