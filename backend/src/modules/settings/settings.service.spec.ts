import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SettingsService } from './settings.service';
import { SiteSetting } from './entities/site-setting.entity';
import { CacheService } from '../cache/cache.service';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SettingItemDto, UpdateSettingsDto } from './dto/update-settings.dto';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepo: Record<string, jest.Mock>;
  let mockCache: Record<string, jest.Mock>;
  let mockDataSource: Record<string, jest.Mock>;

  const mockSettings: Partial<SiteSetting>[] = [
    { id: 1, key: 'color_primary', value: '#2563eb', valueEn: null, group: 'color', defaultValue: '#2563eb', sortOrder: 1 },
    { id: 2, key: 'color_background', value: '#ffffff', valueEn: null, group: 'color', defaultValue: '#ffffff', sortOrder: 4 },
    { id: 3, key: 'font_size_base', value: '1rem', valueEn: null, group: 'typography', defaultValue: '1rem', sortOrder: 12 },
  ];

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue(mockSettings),
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(SiteSetting), useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('findAll', () => {
    it('should return cached settings on cache hit', async () => {
      mockCache.get.mockResolvedValue(mockSettings);
      const result = await service.findAll();
      expect(result).toEqual(mockSettings);
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('should query DB and set cache on cache miss', async () => {
      const result = await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { sortOrder: 'ASC' },
      });
      expect(mockCache.set).toHaveBeenCalledWith('settings:all:ko', mockSettings, 3600);
      expect(result).toEqual(mockSettings);
    });

    it('should filter by group', async () => {
      const colorSettings = mockSettings.filter((s) => s.group === 'color');
      mockRepo.find.mockResolvedValue(colorSettings);
      const result = await service.findAll('color');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { group: 'color' },
        order: { sortOrder: 'ASC' },
      });
      expect(mockCache.set).toHaveBeenCalledWith('settings:color:ko', colorSettings, 3600);
      expect(result).toEqual(colorSettings);
    });

    it('should use locale-specific cache key for EN locale', async () => {
      const enSettings: Partial<SiteSetting>[] = [
        { id: 1, key: 'color_primary', value: '#2563eb', valueEn: null, group: 'color', defaultValue: '#2563eb', sortOrder: 1 },
        { id: 2, key: 'color_background', value: '#ffffff', valueEn: null, group: 'color', defaultValue: '#ffffff', sortOrder: 4 },
        { id: 3, key: 'font_size_base', value: '1rem', valueEn: null, group: 'typography', defaultValue: '1rem', sortOrder: 12 },
      ];
      mockRepo.find.mockResolvedValue(enSettings);
      await service.findAll(undefined, 'en');
      expect(mockCache.set).toHaveBeenCalledWith('settings:all:en', expect.any(Array), 3600);
    });
  });

  describe('getMap', () => {
    it('should return flat key-value object', async () => {
      const result = await service.getMap();
      expect(result).toEqual({
        color_primary: '#2563eb',
        color_background: '#ffffff',
        font_size_base: '1rem',
      });
    });

    it('should return EN values when locale is en and valueEn is set', async () => {
      const settingsWithEn: Partial<SiteSetting>[] = [
        { id: 1, key: 'brand_name', value: '옥화당', valueEn: 'Ockhwadang', group: 'brand', defaultValue: '옥화당', sortOrder: 100 },
        { id: 2, key: 'brand_tagline', value: '자연을 담은 그릇', valueEn: 'Vessels that hold nature', group: 'brand', defaultValue: '자연을 담은 그릇', sortOrder: 101 },
        { id: 3, key: 'font_size_base', value: '1rem', valueEn: null, group: 'typography', defaultValue: '1rem', sortOrder: 12 },
      ];
      mockRepo.find.mockResolvedValue(settingsWithEn);
      const result = await service.getMap('en');
      expect(result['brand_name']).toBe('Ockhwadang');
      expect(result['brand_tagline']).toBe('Vessels that hold nature');
      // null valueEn falls back to KO value
      expect(result['font_size_base']).toBe('1rem');
    });
  });

  describe('bulkUpdate', () => {
    it.each([
      ['color_primary', 'not-color'],
      ['color_dark_primary', '#12345'],
      ['color_primary', 'rgb(256, 0, 0)'],
      ['font_size_base', '0'],
      ['font_size_base', '0rem'],
      ['spacing_md', '-2rem'],
      ['radius_md', ''],
      ['font_weight_normal', '0'],
      ['font_weight_bold', '1001'],
      ['line_height_base', '0'],
      ['font_family_base', 'serif; color:red'],
      ['font_family_base', "'Unclosed font"],
    ])('rejects invalid %s values before updating any batch item', async (key, value) => {
      await expect(service.bulkUpdate([
        { key: 'color_primary', value: '#123456' },
        { key, value },
      ])).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockCache.delPattern).not.toHaveBeenCalled();
    });

    it('rejects invalid English theme values before writing', async () => {
      await expect(service.bulkUpdate([
        { key: 'font_size_base', value: '16px', valueEn: 'large' },
      ])).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('accepts supported theme values, English fallback, and non-theme settings', async () => {
      const mockManager = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
      mockDataSource.transaction.mockImplementation(async (callback: (manager: unknown) => Promise<void>) => callback(mockManager));
      const items: SettingItemDto[] = [
        { key: 'color_primary', value: '#abc' },
        { key: 'color_secondary', value: '#abcd' },
        { key: 'color_background', value: '#123456' },
        { key: 'color_foreground', value: '#12345678' },
        { key: 'color_dark_primary', value: 'rgb(0, 128, 255)' },
        { key: 'font_family_base', value: "'Noto Serif KR', 'Georgia', serif", valueEn: '"Arial", sans-serif' },
        { key: 'font_size_base', value: '1.25rem', valueEn: '18px' },
        { key: 'font_weight_normal', value: '1' },
        { key: 'font_weight_bold', value: '1000' },
        { key: 'line_height_base', value: '1.5' },
        { key: 'spacing_md', value: '0', valueEn: '' },
        { key: 'radius_md', value: '0em', valueEn: null },
        { key: 'business_address', value: '' },
        { key: 'mobile_bottom_nav_visible', value: 'false' },
      ];
      await service.bulkUpdate(items);
      for (const { key, ...fields } of items) {
        expect(mockManager.update).toHaveBeenCalledWith(SiteSetting, { key }, fields);
      }
      expect(mockCache.delPattern).toHaveBeenCalledWith('settings:*');
    });

    it('rejects null base values in DTO validation while allowing omitted base and null English fallback', async () => {
      const invalid = plainToInstance(UpdateSettingsDto, { settings: [{ key: 'font_size_base', value: null }] });
      const valid = plainToInstance(UpdateSettingsDto, { settings: [{ key: 'font_size_base', valueEn: null }] });
      expect(await validate(invalid)).not.toHaveLength(0);
      expect(await validate(valid)).toHaveLength(0);
      await expect(service.bulkUpdate(invalid.settings)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should update settings in a transaction and invalidate cache', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<void>) => cb(mockManager));

      const items = [
        { key: 'color_primary', value: '#ff0000' },
        { key: 'color_background', value: '#000000' },
      ];
      await service.bulkUpdate(items);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockCache.delPattern).toHaveBeenCalledWith('settings:*');
    });

    it('should throw BadRequestException for invalid keys', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<void>) => cb(mockManager));

      await expect(service.bulkUpdate([{ key: 'invalid_key', value: 'y' }])).rejects.toThrow(BadRequestException);
    });

    it('should propagate DB errors', async () => {
      mockDataSource.transaction.mockRejectedValue(new Error('DB error'));
      await expect(service.bulkUpdate([{ key: 'x', value: 'y' }])).rejects.toThrow('DB error');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all values and invalidate cache', async () => {
      const mockManager = {
        query: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<void>) => cb(mockManager));

      await service.resetToDefaults();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.query).toHaveBeenCalledWith(
        'UPDATE site_settings SET value = default_value, value_en = NULL, value_ja = NULL, value_zh = NULL WHERE `group` IN (?, ?, ?, ?, ?)',
        ['color', 'color_dark', 'typography', 'spacing', 'radius'],
      );
      expect(mockCache.delPattern).toHaveBeenCalledWith('settings:*');
    });

    it('should clear locale overrides so EN/legacy locales fall back to defaults', async () => {
      const mockManager = {
        query: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<void>) => cb(mockManager));

      await service.resetToDefaults();

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('value_en = NULL'),
        ['color', 'color_dark', 'typography', 'spacing', 'radius'],
      );
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('value_ja = NULL'),
        ['color', 'color_dark', 'typography', 'spacing', 'radius'],
      );
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('value_zh = NULL'),
        ['color', 'color_dark', 'typography', 'spacing', 'radius'],
      );
    });

    it('should propagate DB errors', async () => {
      mockDataSource.transaction.mockRejectedValue(new Error('DB error'));
      await expect(service.resetToDefaults()).rejects.toThrow('DB error');
    });
  });
});
