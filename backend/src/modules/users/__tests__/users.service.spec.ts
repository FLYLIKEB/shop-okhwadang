import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { User, UserRole } from '../entities/user.entity';
import { UserAddress } from '../entities/user-address.entity';

interface MockRepository {
  findOne: jest.Mock;
  find: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
}

function createMockRepo(): MockRepository {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: MockRepository;
  let addressRepo: MockRepository;

  beforeEach(async () => {
    userRepo = createMockRepo();
    addressRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserAddress), useValue: addressRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('updateProfile', () => {
    it('returns user without password and refreshToken', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        phone: null,
        role: UserRole.USER,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        password: 'hashed',
        refreshToken: 'token',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userRepo.findOne!.mockResolvedValue({ ...mockUser });
      userRepo.save!.mockResolvedValue({ ...mockUser, name: 'Updated' });

      const result = await service.updateProfile(1, { name: 'Updated' });

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException if user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);
      await expect(service.updateProfile(999, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAddress', () => {
    it('throws BadRequestException when max 10 addresses reached', async () => {
      addressRepo.count!.mockResolvedValue(10);
      await expect(
        service.createAddress(1, {
          recipientName: 'Test',
          phone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('unsets existing default when new address is_default=true', async () => {
      addressRepo.count!.mockResolvedValue(1);
      addressRepo.update!.mockResolvedValue({ affected: 1 });
      const newAddress: UserAddress = {
        id: 2,
        userId: 1,
        recipientName: 'Test',
        phone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
        addressDetail: null,
        label: null,
        isDefault: true,
        createdAt: new Date(),
        user: {} as User,
      };
      addressRepo.create!.mockReturnValue(newAddress);
      addressRepo.save!.mockResolvedValue(newAddress);

      await service.createAddress(1, {
        recipientName: 'Test',
        phone: '010-1234-5678',
        zipcode: '12345',
        address: '서울시',
        isDefault: true,
      });

      expect(addressRepo.update).toHaveBeenCalledWith({ userId: 1 }, { isDefault: false });
    });
  });

  describe('updateAddress', () => {
    it('throws ForbiddenException when userId does not match', async () => {
      addressRepo.findOne!.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.updateAddress(1, 1, { recipientName: 'X' })).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when address not found', async () => {
      addressRepo.findOne!.mockResolvedValue(null);
      await expect(service.updateAddress(1, 999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    it('throws ForbiddenException when userId does not match', async () => {
      addressRepo.findOne!.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.deleteAddress(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when address not found', async () => {
      addressRepo.findOne!.mockResolvedValue(null);
      await expect(service.deleteAddress(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
