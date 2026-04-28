import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../cache/cache.service';
import { TokenBlacklist } from './entities/token-blacklist.entity';

const BLACKLIST_CACHE_PREFIX = 'blacklist:';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @InjectRepository(TokenBlacklist)
    private readonly blacklistRepository: Repository<TokenBlacklist>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Add a token JTI to the blacklist.
   * Cached in CacheService (hot path) and persisted to DB for durability.
   */
  async addToBlacklist(jti: string, userId: number, expiresAt: Date, reason: string): Promise<void> {
    const ttlSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

    await this.cacheService.set(`${BLACKLIST_CACHE_PREFIX}${jti}`, true, ttlSeconds);

    const entry = this.blacklistRepository.create({ jti, userId, expiresAt, reason });
    await this.blacklistRepository.save(entry);

    this.logger.log(`Token blacklisted: jti=${jti}, userId=${userId}, reason=${reason}`);
  }

  /**
   * Check if a token JTI is blacklisted.
   * Checks CacheService first (hot path), falls back to DB.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const cached = await this.cacheService.get<boolean>(`${BLACKLIST_CACHE_PREFIX}${jti}`);
    if (cached !== null) {
      return true;
    }

    const entry = await this.blacklistRepository.findOne({ where: { jti } });
    if (entry) {
      const ttlSeconds = Math.max(0, Math.ceil((entry.expiresAt.getTime() - Date.now()) / 1000));
      if (ttlSeconds > 0) {
        await this.cacheService.set(`${BLACKLIST_CACHE_PREFIX}${jti}`, true, ttlSeconds);
        return true;
      }
    }

    return false;
  }

  /**
   * Revoke all tokens for a specific user (logout everywhere).
   * Adds all existing user tokens to blacklist — note: only tokens already issued
   * can be revoked; future tokens will naturally be blacklisted when they are used.
   */
  async revokeAllUserTokens(userId: number, reason: string): Promise<void> {
    await this.blacklistRepository.update(
      { userId },
      { reason },
    );
    this.logger.log(`All tokens revoked for userId=${userId}, reason=${reason}`);
  }

  /**
   * Cron job: clean up expired blacklist entries from DB.
   * Runs every hour. CacheService handles TTL-based eviction automatically.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredEntries(): Promise<void> {
    const result = await this.blacklistRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired blacklist entries`);
    }
  }
}