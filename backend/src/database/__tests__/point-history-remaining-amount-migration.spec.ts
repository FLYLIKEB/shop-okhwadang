import { QueryRunner } from 'typeorm';
import { AddPointHistoryRemainingAmount1787300000000 } from '../migrations/1787300000000-AddPointHistoryRemainingAmount';

describe('point history remaining amount migration', () => {
  it('adds idempotently, backfills FIFO lots, and safely reverses the column', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddPointHistoryRemainingAmount1787300000000();

    await migration.up({ query } as unknown as QueryRunner);
    await migration.down({ query } as unknown as QueryRunner);

    const statements = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(statements).toContain("column_name = 'remaining_amount'");
    expect(statements).toContain('ADD COLUMN remaining_amount int NULL AFTER amount');
    expect(statements).toContain("type IN ('earn', 'admin_adjust') AND amount > 0 THEN amount");
    expect(statements).toContain("history_type = 'expire' AND history_related_id IS NOT NULL");
    expect(statements).toContain("history_type IN ('spend', 'admin_adjust')");
    expect(statements).toContain('ORDER BY expires_at IS NULL ASC, expires_at ASC, created_at ASC, id ASC');
    expect(statements).toContain('CALL `backfill_point_history_remaining_amount`()');
    expect(statements).toContain('DROP COLUMN remaining_amount');
  });

  it('fails unreconcilable history with identifiers and rolls back all backfill writes', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => {
      if (sql === 'CALL `backfill_point_history_remaining_amount`()') {
        throw new Error('Unallocatable point history: user_id=7, history_id=42');
      }
    });
    const migration = new AddPointHistoryRemainingAmount1787300000000();

    await expect(migration.up({ query } as unknown as QueryRunner)).rejects.toThrow(
      'Unallocatable point history: user_id=7, history_id=42',
    );

    const procedure = query.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes('CREATE PROCEDURE'));
    expect(procedure).toContain('DECLARE EXIT HANDLER FOR SQLEXCEPTION');
    expect(procedure).toContain('ROLLBACK;');
    expect(procedure).toContain("SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = diagnostic_message");
    expect(procedure).toContain('Unallocatable point history: user_id=');
  });

  it('recomputes and validates chronological running balances after allocation', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddPointHistoryRemainingAmount1787300000000();

    await migration.up({ query } as unknown as QueryRunner);

    const procedure = query.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes('CREATE PROCEDURE'));
    expect(procedure).toContain('DECLARE balance_cursor CURSOR FOR');
    expect(procedure).toContain('SET running_balance = running_balance + balance_amount');
    expect(procedure).toContain('Impossible point ledger balance: user_id=');
    expect(procedure).toContain('SET balance = running_balance');
    expect(procedure).toContain('COMMIT;');
  });
});
