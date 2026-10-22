import { QueryRunner } from 'typeorm';
import { AddPendingNotificationTemplate1788500000001 } from '../migrations/1788500000001-AddPendingNotificationTemplate';

describe('pending notification template migration', () => {
  it.each([true, false])('repairs previously created tables idempotently (column exists: %s)', async exists => {
    const runner = { hasColumn: jest.fn().mockResolvedValue(exists), addColumn: jest.fn() };
    await new AddPendingNotificationTemplate1788500000001().up(runner as unknown as QueryRunner);
    expect(runner.hasColumn).toHaveBeenCalledWith('notification_templates', 'pending_template_id');
    expect(runner.addColumn).toHaveBeenCalledTimes(exists ? 0 : 1);
    if (!exists) expect(runner.addColumn).toHaveBeenCalledWith('notification_templates', expect.objectContaining({ name: 'pending_template_id', isNullable: true }));
  });
});
