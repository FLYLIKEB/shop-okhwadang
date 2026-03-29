import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SettingsService } from './settings.service';
import { SiteSetting } from './entities/site-setting.entity';
import { CacheService } from '../cache/cache.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepo: Record<string, jest.Mock>;
  let mockCache: Record<string, jest.Mock>;
  let mockDataSource: Record<string, jest.Mock>;
  let mockQueryRunner: Record<string, unknown>;

  const mockSettings: Partial<SiteSetting>[] = [
    { id: 1, key: 'color_primary', value: '#2563eb', group: 'color', defaultValue: '#2563eb', sortOrder: 1 },
    { id: 2, key: 'color_background', value: '#ffffff', group: 'color', defaultValue: '#ffffff', sortOrder: 4 },
    { id: 3, key: 'font_size_base', value: '1rem', group: 'typography', defaultValue: '1rem', sortOrder: 12 },
  ];

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      },
    };

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
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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
      expect(mockCache.set).toHaveBeenCalledWith('settings:all', mockSettings, 3600);
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
      expect(mockCache.set).toHaveBeenCalledWith('settings:color', colorSettings, 3600);
      expect(result).toEqual(colorSettings);
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
  });

  describe('bulkUpdate', () => {
    it('should update settings in a transaction and invalidate cache', async () => {
      const items = [
        { key: 'color_primary', value: '#ff0000' },
        { key: 'color_background', value: '#000000' },
      ];
      await service.bulkUpdate(items);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockCache.delPattern).toHaveBeenCalledWith('settings:*');
    });

    it('should rollback on error', async () => {
      (mockQueryRunner.manager as Record<string, jest.Mock>).createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      await expect(service.bulkUpdate([{ key: 'x', value: 'y' }])).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all values and invalidate cache', async () => {
      await service.resetToDefaults();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'UPDATE site_settings SET value = default_value',
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockCache.delPattern).toHaveBeenCalledWith('settings:*');
    });

    it('should rollback on error', async () => {
      (mockQueryRunner.query as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(service.resetToDefaults()).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
