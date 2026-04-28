import { Repository } from 'typeorm';
import { reorderEntities } from '../reorder.util';

interface TestEntity {
  id: number;
  sortOrder: number;
}

describe('reorderEntities', () => {
  it('각 항목에 대해 repo.update 호출 (기본 sortField=sortOrder)', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const repo = { update } as unknown as Repository<TestEntity>;

    await reorderEntities(repo, [
      { id: 1, sortOrder: 10 },
      { id: 2, sortOrder: 20 },
      { id: 3, sortOrder: 30 },
    ]);

    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenCalledWith(1, { sortOrder: 10 });
    expect(update).toHaveBeenCalledWith(2, { sortOrder: 20 });
    expect(update).toHaveBeenCalledWith(3, { sortOrder: 30 });
  });

  it('커스텀 sortField 사용 시 해당 컬럼명으로 update', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const repo = { update } as unknown as Repository<TestEntity>;

    await reorderEntities(repo, [{ id: 1, sortOrder: 5 }], 'displayOrder');

    expect(update).toHaveBeenCalledWith(1, { displayOrder: 5 });
  });

  it('Promise.all 병렬 실행 — 한 항목이 늦어도 나머지는 동시 진행', async () => {
    const order: number[] = [];
    const update = jest.fn().mockImplementation(async (id: number) => {
      if (id === 1) {
        await new Promise((r) => setTimeout(r, 30));
      }
      order.push(id);
    });
    const repo = { update } as unknown as Repository<TestEntity>;

    await reorderEntities(repo, [
      { id: 1, sortOrder: 10 },
      { id: 2, sortOrder: 20 },
      { id: 3, sortOrder: 30 },
    ]);

    // 순차 for-of await였다면 [1,2,3]. Promise.all이라 [2,3,1]
    expect(order[0]).not.toBe(1);
    expect(order).toContain(1);
    expect(order).toContain(2);
    expect(order).toContain(3);
  });

  it('빈 배열 입력 시 update 호출 없음', async () => {
    const update = jest.fn();
    const repo = { update } as unknown as Repository<TestEntity>;

    await reorderEntities(repo, []);

    expect(update).not.toHaveBeenCalled();
  });

  it('하나라도 update 실패 시 reject', async () => {
    const update = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);
    const repo = { update } as unknown as Repository<TestEntity>;

    await expect(
      reorderEntities(repo, [
        { id: 1, sortOrder: 1 },
        { id: 2, sortOrder: 2 },
        { id: 3, sortOrder: 3 },
      ]),
    ).rejects.toThrow('DB error');
  });
});
