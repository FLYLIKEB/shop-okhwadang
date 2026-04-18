import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService, CreateAuditLogDto } from '../audit-log.service';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create and save an audit log entry', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 1,
        actorRole: 'admin',
        action: AuditAction.ORDER_STATUS_UPDATE,
        resourceType: 'order',
        resourceId: 123,
        beforeJson: { status: 'pending' },
        afterJson: { status: 'paid' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockEntry = { id: 1, ...dto, createdAt: new Date() };
      mockRepository.create.mockReturnValue(mockEntry as AuditLog);
      mockRepository.save.mockResolvedValue(mockEntry as AuditLog);

      const result = await service.log(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        actorId: 1,
        actorRole: 'admin',
        action: AuditAction.ORDER_STATUS_UPDATE,
        resourceType: 'order',
        resourceId: 123,
        beforeJson: { status: 'pending' },
        afterJson: { status: 'paid' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockEntry);
      expect(result).toEqual(mockEntry);
    });

    it('should handle null resourceId', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 1,
        actorRole: 'anonymous',
        action: AuditAction.LOGIN_FAILURE,
        resourceType: 'auth',
        beforeJson: { email: 'test@example.com' },
        afterJson: { reason: 'user_not_found' },
      };

      const mockEntry = { id: 1, ...dto, resourceId: null, createdAt: new Date() };
      mockRepository.create.mockReturnValue(mockEntry as AuditLog);
      mockRepository.save.mockResolvedValue(mockEntry as AuditLog);

      const result = await service.log(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: null }),
      );
      expect(result.resourceId).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockLogs = [
        { id: 1, actorId: 1, action: AuditAction.LOGIN_SUCCESS },
        { id: 2, actorId: 2, action: AuditAction.LOGIN_FAILURE },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockLogs as AuditLog[], 2]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: mockLogs,
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply actorId filter', async () => {
      mockRepository.findAndCount.mockResolvedValue([[] as AuditLog[], 0]);

      await service.findAll({ actorId: 1, page: 1, limit: 20 });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ actorId: 1 }),
        }),
      );
    });

    it('should apply action filter', async () => {
      mockRepository.findAndCount.mockResolvedValue([[] as AuditLog[], 0]);

      await service.findAll({ action: AuditAction.LOGIN_SUCCESS, page: 1, limit: 20 });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: AuditAction.LOGIN_SUCCESS }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      mockRepository.findAndCount.mockResolvedValue([[] as AuditLog[], 0]);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.findAll({ startDate, endDate, page: 1, limit: 20 });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockRepository.findAndCount.mockResolvedValue([[] as AuditLog[], 50]);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findByResource', () => {
    it('should find logs by resource type and id', async () => {
      const mockLogs = [
        { id: 1, resourceType: 'order', resourceId: 123 },
        { id: 2, resourceType: 'order', resourceId: 123 },
      ];
      mockRepository.find.mockResolvedValue(mockLogs as AuditLog[]);

      const result = await service.findByResource('order', 123);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { resourceType: 'order', resourceId: 123 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByActor', () => {
    it('should find logs by actor id with pagination', async () => {
      const mockLogs = [
        { id: 1, actorId: 5 },
        { id: 2, actorId: 5 },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockLogs as AuditLog[], 2]);

      const result = await service.findByActor(5, 1, 20);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { actorId: 5 },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({ data: mockLogs, total: 2 });
    });
  });
});