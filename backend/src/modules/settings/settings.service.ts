import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SiteSetting } from './entities/site-setting.entity';
import { SettingItemDto } from './dto/update-settings.dto';
import { CacheService } from '../cache/cache.service';
import { applyLocale } from '../../common/utils/locale.util';

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

  async findAll(group?: string, locale?: string): Promise<SiteSetting[]> {
    const cacheKey = `settings:${group || 'all'}:${locale || 'ko'}`;
    const cached = await this.cacheService.get<SiteSetting[]>(cacheKey);
    if (cached) return cached;

    const where = group ? { group } : {};
    const results = await this.settingRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });

    const localized = results.map((s) => applyLocale(s, locale, ['value']));
    await this.cacheService.set(cacheKey, localized, CACHE_TTL);
    return localized;
  }

  async getMap(locale?: string): Promise<Record<string, string>> {
    const settings = await this.findAll(undefined, locale);
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const map = await this.getMap();
    const raw = map[key];
    if (raw === undefined || raw === null) return defaultValue;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async bulkUpdate(items: SettingItemDto[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invalidKeys: string[] = [];
      for (const item of items) {
        const updateFields: Partial<SiteSetting> = {};
        if (item.value !== undefined) updateFields.value = item.value;
        if (item.valueEn !== undefined) updateFields.valueEn = item.valueEn;
        if (Object.keys(updateFields).length === 0) continue;
        const result = await manager.update(SiteSetting, { key: item.key }, updateFields);
        if (result.affected === 0) {
          invalidKeys.push(item.key);
        }
      }
      if (invalidKeys.length > 0) {
        throw new BadRequestException(`존재하지 않는 설정 키: ${invalidKeys.join(', ')}`);
      }
      this.logger.log(`Settings bulk updated: ${items.length} items`);
    });
    await this.cacheService.delPattern('settings:*');
  }

  async resetToDefaults(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE site_settings SET value = default_value`,
      );
      this.logger.log('Settings reset to defaults');
    });
    await this.cacheService.delPattern('settings:*');
  }
}
