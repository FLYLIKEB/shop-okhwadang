import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  function setup() {
    const records = new Map<string, Record<string, unknown>>();
    const repository = {
      findOne: jest.fn(async ({ where }: { where: { scope: string; operation: string; key: string } }) =>
        records.get(`${where.scope}:${where.operation}:${where.key}`) ?? null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        const record = value as Record<string, unknown>;
        records.set(`${record.scope}:${record.operation}:${record.key}`, record);
        return record;
      }),
      update: jest.fn(async (criteria, value) => {
        for (const record of records.values()) {
          const matches = typeof criteria === 'number'
            ? record.id === criteria
            : Object.entries(criteria as Record<string, unknown>).every(([key, item]) => record[key] === item);
          if (matches) {
            Object.assign(record, value);
            return { affected: 1 };
          }
        }
        return { affected: 0 };
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (work) => work({ getRepository: () => repository })),
      getRepository: () => repository,
    };
    return { service: new IdempotencyService(dataSource as never), repository, records };
  }

  it('replays the committed result without rerunning effects', async () => {
    const { service } = setup();
    const effect = jest.fn().mockResolvedValue({ orderId: 7 });
    await expect(service.execute('member:1', 'order.create', 'key', { quantity: 1 }, effect)).resolves.toEqual({ result: { orderId: 7 }, replayed: false });
    await expect(service.execute('member:1', 'order.create', 'key', { quantity: 1 }, effect)).resolves.toEqual({ result: { orderId: 7 }, replayed: true });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('rejects a changed payload for an existing key', async () => {
    const { service } = setup();
    await service.execute('member:1', 'order.create', 'key', { quantity: 1 }, async () => ({ orderId: 7 }));
    await expect(service.execute('member:1', 'order.create', 'key', { quantity: 2 }, async () => ({ orderId: 8 })))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('commits pending before external work and replays only after local completion', async () => {
    const { service, repository, records } = setup();
    repository.save.mockImplementation(async (value) => {
      const record = value as Record<string, unknown>;
      record.id ??= 1;
      records.set(`${record.scope}:${record.operation}:${record.key}`, record);
      return record;
    });
    const pending = await service.reserve<{ orderId: number }>('member:1', 'payment.confirm', 'key', { orderId: 7 });
    expect(pending).toEqual(expect.objectContaining({ id: 1, owner: true, replayed: false }));
    await service.complete(
      { getRepository: () => repository } as never,
      1,
      pending.leaseOwner!,
      { orderId: 7 },
    );
    await expect(service.reserve('member:1', 'payment.confirm', 'key', { orderId: 7 }))
      .resolves.toEqual(expect.objectContaining({ id: 1, owner: false, replayed: true, result: { orderId: 7 } }));
  });

  it('takes over an expired pending lease exactly once', async () => {
    const { service, repository, records } = setup();
    repository.save.mockImplementation(async (value) => {
      const record = value as Record<string, unknown>;
      record.id ??= 1;
      records.set(`${record.scope}:${record.operation}:${record.key}`, record);
      return record;
    });
    await service.reserve('member:1', 'payment.confirm', 'expired', { orderId: 7 });
    const record = [...records.values()][0];
    record.leaseExpiresAt = new Date(Date.now() - 1);
    const takeover = await service.reserve('member:1', 'payment.confirm', 'expired', { orderId: 7 });
    expect(takeover).toEqual(expect.objectContaining({ id: 1, owner: true, replayed: false }));
    expect(record.leaseExpiresAt).toBeInstanceOf(Date);
  });

  it('waits beyond 500ms for a same-key owner and replays its completed result', async () => {
    const { service, repository, records } = setup();
    repository.save.mockImplementation(async (value) => {
      const record = value as Record<string, unknown>;
      record.id ??= 1;
      records.set(`${record.scope}:${record.operation}:${record.key}`, record);
      return record;
    });
    const owner = await service.reserve<{ orderId: number }>('member:1', 'payment.confirm', 'slow', { orderId: 7 });
    const observer = service.reserve<{ orderId: number }>('member:1', 'payment.confirm', 'slow', { orderId: 7 });
    await new Promise((resolve) => setTimeout(resolve, 600));
    await service.complete({ getRepository: () => repository } as never, owner.id, owner.leaseOwner!, { orderId: 7 });
    await expect(observer).resolves.toEqual(expect.objectContaining({ owner: false, replayed: true, result: { orderId: 7 } }));
  });

  it('rejects stale-owner completion after lease takeover', async () => {
    const { service, repository, records } = setup();
    repository.save.mockImplementation(async (value) => {
      const record = value as Record<string, unknown>;
      record.id ??= 1;
      records.set(`${record.scope}:${record.operation}:${record.key}`, record);
      return record;
    });
    const first = await service.reserve('member:1', 'payment.confirm', 'fenced', { orderId: 7 });
    const record = [...records.values()][0];
    record.leaseExpiresAt = new Date(Date.now() - 1);
    const second = await service.reserve('member:1', 'payment.confirm', 'fenced', { orderId: 7 });
    await expect(service.complete({ getRepository: () => repository } as never, first.id, first.leaseOwner!, { orderId: 7 }))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(service.complete({ getRepository: () => repository } as never, second.id, second.leaseOwner!, { orderId: 7 }))
      .resolves.toBeUndefined();
  });
});
