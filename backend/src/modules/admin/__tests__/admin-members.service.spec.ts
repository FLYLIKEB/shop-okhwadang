import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminMembersService } from '../admin-members.service';
import { User, UserRole } from '../../users/entities/user.entity';

function createMockRepository() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@test.com',
    password: 'hashed',
    name: '테스트',
    phone: null,
    role: UserRole.USER,
    isActive: true,
    refreshToken: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AdminMembersService', () => {
  let service: AdminMembersService;
  let userRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    userRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMembersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<AdminMembersService>(AdminMembersService);
  });

  describe('findAll', () => {
    it('should return paginated members', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('updateRole', () => {
    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRole(999, UserRole.ADMIN, 1, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when changing own role', async () => {
      await expect(
        service.updateRole(1, UserRole.ADMIN, 1, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for inactive member', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 2, isActive: false }));
      await expect(
        service.updateRole(2, UserRole.ADMIN, 1, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('admin → user→admin: allowed', async () => {
      const target = makeUser({ id: 2, role: UserRole.USER });
      userRepo.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(makeUser({ id: 2, role: UserRole.ADMIN }));
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateRole(2, UserRole.ADMIN, 1, UserRole.ADMIN);
      expect(userRepo.update).toHaveBeenCalledWith(2, { role: UserRole.ADMIN });
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('admin → admin→user: allowed', async () => {
      const target = makeUser({ id: 2, role: UserRole.ADMIN });
      userRepo.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(makeUser({ id: 2, role: UserRole.USER }));
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateRole(2, UserRole.USER, 1, UserRole.ADMIN);
      expect(userRepo.update).toHaveBeenCalledWith(2, { role: UserRole.USER });
      expect(result.role).toBe(UserRole.USER);
    });

    it('admin cannot grant super_admin', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 2 }));
      await expect(
        service.updateRole(2, UserRole.SUPER_ADMIN, 1, UserRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin cannot change super_admin role', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 2, role: UserRole.SUPER_ADMIN }));
      await expect(
        service.updateRole(2, UserRole.USER, 1, UserRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('super_admin → user→super_admin: allowed', async () => {
      const target = makeUser({ id: 2, role: UserRole.USER });
      userRepo.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(makeUser({ id: 2, role: UserRole.SUPER_ADMIN }));
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateRole(2, UserRole.SUPER_ADMIN, 1, UserRole.SUPER_ADMIN);
      expect(result.role).toBe(UserRole.SUPER_ADMIN);
    });

    it('super_admin → super_admin→user: allowed (multiple super_admins)', async () => {
      const target = makeUser({ id: 2, role: UserRole.SUPER_ADMIN });
      userRepo.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(makeUser({ id: 2, role: UserRole.USER }));
      userRepo.count.mockResolvedValue(2);
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateRole(2, UserRole.USER, 1, UserRole.SUPER_ADMIN);
      expect(result.role).toBe(UserRole.USER);
    });

    it('should throw when demoting last super_admin', async () => {
      const target = makeUser({ id: 2, role: UserRole.SUPER_ADMIN });
      userRepo.findOne.mockResolvedValue(target);
      userRepo.count.mockResolvedValue(1);

      await expect(
        service.updateRole(2, UserRole.USER, 1, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('response should not contain password or refreshToken', async () => {
      const target = makeUser({ id: 2, password: 'secret', refreshToken: 'token123' });
      userRepo.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(target);
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateRole(2, UserRole.ADMIN, 1, UserRole.SUPER_ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });
  });
});
