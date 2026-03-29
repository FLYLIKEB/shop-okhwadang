import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('Redis 없을 때 get → null 반환 (fallback)', async () => {
    // REDIS_URL이 없으면 client = null → null 반환
    const result = await service.get<string>('some-key');
    expect(result).toBeNull();
  });

  it('Redis 없을 때 set → 에러 없이 통과', async () => {
    await expect(service.set('key', { data: 1 }, 60)).resolves.toBeUndefined();
  });

  it('Redis 없을 때 del → 에러 없이 통과', async () => {
    await expect(service.del('key')).resolves.toBeUndefined();
  });

  it('Redis 없을 때 delPattern → 에러 없이 통과', async () => {
    await expect(service.delPattern('products:*')).resolves.toBeUndefined();
  });
});
