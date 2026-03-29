import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SiteSetting } from './entities/site-setting.entity';
import { SettingItemDto } from './dto/update-settings.dto';
import { CacheService } from '../cache/cache.service';

const CACHE_TTL = 3600;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SiteSetting)
    private readonly settingRepo: Repository<SiteSetting>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(group?: string): Promise<SiteSetting[]> {
    const cacheKey = `settings:${group || 'all'}`;
    const cached = await this.cacheService.get<SiteSetting[]>(cacheKey);
    if (cached) return cached;

    const where = group ? { group } : {};
    const results = await this.settingRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });

    await this.cacheService.set(cacheKey, results, CACHE_TTL);
    return results;
  }

  async getMap(): Promise<Record<string, string>> {
    const settings = await this.findAll();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  async bulkUpdate(items: SettingItemDto[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const invalidKeys: string[] = [];
      for (const item of items) {
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(SiteSetting)
          .set({ value: item.value })
          .where('setting_key = :key', { key: item.key })
          .execute();
        if (result.affected === 0) {
          invalidKeys.push(item.key);
        }
      }
      if (invalidKeys.length > 0) {
        throw new BadRequestException(`존재하지 않는 설정 키: ${invalidKeys.join(', ')}`);
      }
      await queryRunner.commitTransaction();
      this.logger.log(`Settings bulk updated: ${items.length} items`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
    await this.cacheService.delPattern('settings:*');
  }

  async resetToDefaults(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE site_settings SET value = default_value`,
      );
      await queryRunner.commitTransaction();
      this.logger.log('Settings reset to defaults');
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
    await this.cacheService.delPattern('settings:*');
  }
}
