import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchedulerLockService } from '../scheduler-lock.service';

describe('SchedulerLockService', () => {
  let query: jest.Mock;
  let service: SchedulerLockService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    query = jest.fn();
    service = new SchedulerLockService({ query } as unknown as DataSource);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    delete process.env.INSTANCE_ID;
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('획득 성공: 현재 인스턴스가 락 소유자인 경우 true 반환', async () => {
    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ instance_id: 'instance-A' }]);

    const acquired = await service.acquireLock({
      lockName: 'cron:test-acquire',
      ttlMinutes: 55,
      instanceId: 'instance-A',
    });

    expect(acquired).toBe(true);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO scheduler_locks'),
      ['cron:test-acquire', 'instance-A', expect.any(Date), expect.any(Date)],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT instance_id FROM scheduler_locks'),
      ['cron:test-acquire'],
    );
  });

  it('만료 후 재획득: fallback instance_id 정책으로 락 소유 확인', async () => {
    query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ instance_id: 'fallback-instance' }]);

    const acquired = await service.acquireLock({
      lockName: 'cron:test-reacquire',
      ttlMinutes: 10,
      fallbackInstanceId: 'fallback-instance',
    });

    expect(acquired).toBe(true);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ON DUPLICATE KEY UPDATE'),
      ['cron:test-reacquire', 'fallback-instance', expect.any(Date), expect.any(Date)],
    );
  });

  it('해제 실패: 예외를 삼키고 에러 로그만 남긴다', async () => {
    query.mockRejectedValueOnce(new Error('release failed'));

    await expect(
      service.releaseLock({
        lockName: 'cron:test-release',
        instanceId: 'instance-A',
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('action=release-error'),
    );
  });
});
