import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache.service';

describe('CacheService (in-memory)', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('set 후 get → 동일 값 반환', async () => {
    await service.set('key', { data: 1 }, 60);
    expect(await service.get('key')).toEqual({ data: 1 });
  });

  it('TTL 만료 후 get → null', async () => {
    jest.useFakeTimers();
    await service.set('key', 'v', 1);
    jest.advanceTimersByTime(1500);
    expect(await service.get('key')).toBeNull();
    jest.useRealTimers();
  });

  it('del 후 get → null', async () => {
    await service.set('key', 'v', 60);
    await service.del('key');
    expect(await service.get('key')).toBeNull();
  });

  it('delPattern → 매칭 키만 삭제', async () => {
    await service.set('products:1', 'a', 60);
    await service.set('products:2', 'b', 60);
    await service.set('users:1', 'c', 60);
    await service.delPattern('products:*');
    expect(await service.get('products:1')).toBeNull();
    expect(await service.get('products:2')).toBeNull();
    expect(await service.get('users:1')).toBe('c');
  });

  it('존재하지 않는 키 get → null', async () => {
    expect(await service.get('missing')).toBeNull();
  });
});
