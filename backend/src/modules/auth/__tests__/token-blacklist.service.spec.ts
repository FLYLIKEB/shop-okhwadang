import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { TokenBlacklistService } from '../token-blacklist.service';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { CacheService } from '../../cache/cache.service';

const mockBlacklistRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
};

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: getRepositoryToken(TokenBlacklist), useValue: mockBlacklistRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  describe('addToBlacklist', () => {
    it('should cache the token and save to DB', async () => {
      const jti = 'test-jti-uuid';
      const userId = 1;
      const expiresAt = new Date(Date.now() + 3600_000);
      const reason = 'user_logout';

      mockCacheService.set.mockResolvedValue(undefined);
      mockBlacklistRepository.create.mockReturnValue({ jti, userId, expiresAt, reason });
      mockBlacklistRepository.save.mockResolvedValue(undefined);

      await service.addToBlacklist(jti, userId, expiresAt, reason);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:${jti}`,
        true,
        expect.any(Number),
      );
      expect(mockBlacklistRepository.create).toHaveBeenCalledWith({
        jti,
        userId,
        expiresAt,
        reason,
      });
      expect(mockBlacklistRepository.save).toHaveBeenCalled();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if found in cache', async () => {
      mockCacheService.get.mockResolvedValue(true);

      const result = await service.isBlacklisted('cached-jti');

      expect(result).toBe(true);
      expect(mockBlacklistRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true if found in DB but not in cache (cache miss → repopulate cache)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const futureDate = new Date(Date.now() + 3600_000);
      mockBlacklistRepository.findOne.mockResolvedValue({
        jti: 'db-jti',
        userId: 1,
        expiresAt: futureDate,
        reason: 'user_logout',
      });
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.isBlacklisted('db-jti');

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `blacklist:db-jti`,
        true,
        expect.any(Number),
      );
    });

    it('should return false if not found in cache or DB', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockBlacklistRepository.findOne.mockResolvedValue(null);

      const result = await service.isBlacklisted('unknown-jti');

      expect(result).toBe(false);
    });

    it('should not repopulate cache if DB entry is already expired', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const pastDate = new Date(Date.now() - 1000);
      mockBlacklistRepository.findOne.mockResolvedValue({
        jti: 'expired-jti',
        userId: 1,
        expiresAt: pastDate,
        reason: 'user_logout',
      });

      const result = await service.isBlacklisted('expired-jti');

      expect(result).toBe(false);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should update all user tokens with reason', async () => {
      mockBlacklistRepository.update.mockResolvedValue({ affected: 5 });

      await service.revokeAllUserTokens(1, 'user_logout_all');

      expect(mockBlacklistRepository.update).toHaveBeenCalledWith(
        { userId: 1 },
        { reason: 'user_logout_all' },
      );
    });
  });

  describe('cleanupExpiredEntries (cron)', () => {
    it('should delete expired entries and log count', async () => {
      const deleteResult = { affected: 3 };
      mockBlacklistRepository.delete.mockResolvedValue(deleteResult);
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanupExpiredEntries();

      expect(mockBlacklistRepository.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(expect.any(Date)),
      });
      expect(logSpy).toHaveBeenCalledWith('Cleaned up 3 expired blacklist entries');
    });

    it('should not log when no expired entries', async () => {
      mockBlacklistRepository.delete.mockResolvedValue({ affected: 0 });
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.cleanupExpiredEntries();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});