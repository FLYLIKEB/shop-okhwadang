import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AdminPointsController } from '../admin-points.controller';
import { PointsService } from '../points.service';

const mockPointsService = {
  getUserPointSummary: jest.fn(),
  getUserPointHistoryForAdmin: jest.fn(),
  adjustPointsManually: jest.fn(),
};

describe('AdminPointsController', () => {
  let controller: AdminPointsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPointsController],
      providers: [{ provide: PointsService, useValue: mockPointsService }],
    }).compile();

    controller = module.get<AdminPointsController>(AdminPointsController);
  });

  it('limits admin points endpoints to admin roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminPointsController)).toEqual(['admin', 'super_admin']);
  });

  it('delegates point summary lookup', async () => {
    mockPointsService.getUserPointSummary.mockResolvedValue({ userId: 9, balance: 3000 });

    await expect(controller.getUserPoints(9)).resolves.toEqual({ userId: 9, balance: 3000 });
    expect(mockPointsService.getUserPointSummary).toHaveBeenCalledWith(9);
  });

  it('delegates point history lookup', async () => {
    mockPointsService.getUserPointHistoryForAdmin.mockResolvedValue({
      items: [{ id: 1, sourceKind: 'order_use' }],
      total: 1,
      page: 1,
      limit: 20,
    });

    await expect(controller.getUserPointHistory(9)).resolves.toEqual({
      items: [{ id: 1, sourceKind: 'order_use' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(mockPointsService.getUserPointHistoryForAdmin).toHaveBeenCalledWith(9, undefined, undefined);
  });

  it('delegates manual adjustments with manager actor context', async () => {
    mockPointsService.adjustPointsManually.mockResolvedValue({ pointHistoryId: 11, auditLogId: 22, userId: 9, delta: 1000, balanceAfter: 5000, description: '관리자 수동 포인트 조정: CS 보상 지급', createdAt: '2026-07-25T00:00:00.000Z' });

    await expect(
      controller.createAdjustment(
        { userId: 9, delta: 1000, reason: 'CS 보상 지급' },
        { user: { id: 7, email: 'admin@example.com', role: UserRole.ADMIN } },
      ),
    ).resolves.toEqual({ pointHistoryId: 11, auditLogId: 22, userId: 9, delta: 1000, balanceAfter: 5000, description: '관리자 수동 포인트 조정: CS 보상 지급', createdAt: '2026-07-25T00:00:00.000Z' });

    expect(mockPointsService.adjustPointsManually).toHaveBeenCalledWith(
      { actorId: 7, actorRole: UserRole.ADMIN, ip: null, userAgent: null },
      { userId: 9, delta: 1000, reason: 'CS 보상 지급' },
    );
  });
});
