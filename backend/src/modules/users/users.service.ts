import {
  Injectable, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserAddress } from './entities/user-address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { findOrThrow } from '../../common/utils/repository.util';

const MAX_ADDRESSES = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
  ) {}

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Omit<User, 'password' | 'refreshToken'>> {
    const user = await findOrThrow(this.userRepository, { id: userId } as any, '사용자를 찾을 수 없습니다.');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;

    const saved = await this.userRepository.save(user);
    this.logger.log(`Profile updated: userId=${userId}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...rest } = saved;
    return rest;
  }

  async getAddresses(userId: number): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto): Promise<UserAddress> {
    const count = await this.addressRepository.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(`배송지는 최대 ${MAX_ADDRESSES}개까지 저장할 수 있습니다.`);
    }

    if (dto.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      userId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail ?? null,
      label: dto.label ?? null,
      isDefault: dto.isDefault ?? false,
    });

    const saved = await this.addressRepository.save(address);
    this.logger.log(`Address created: userId=${userId} addressId=${saved.id}`);
    return saved;
  }

  async updateAddress(userId: number, addressId: number, dto: UpdateAddressDto): Promise<UserAddress> {
    const address = await findOrThrow(this.addressRepository, { id: addressId } as any, '배송지를 찾을 수 없습니다.');
    if (Number(address.userId) !== Number(userId)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    if (dto.isDefault) {
      await this.addressRepository.update({ userId }, { isDefault: false });
    }

    Object.assign(address, {
      ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.zipcode !== undefined && { zipcode: dto.zipcode }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.addressDetail !== undefined && { addressDetail: dto.addressDetail }),
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    });

    const saved = await this.addressRepository.save(address);
    this.logger.log(`Address updated: userId=${userId} addressId=${addressId}`);
    return saved;
  }

  async deleteAddress(userId: number, addressId: number): Promise<{ message: string }> {
    const address = await findOrThrow(this.addressRepository, { id: addressId } as any, '배송지를 찾을 수 없습니다.');
    if (Number(address.userId) !== Number(userId)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    await this.addressRepository.remove(address);
    this.logger.log(`Address deleted: userId=${userId} addressId=${addressId}`);
    return { message: '삭제되었습니다.' };
  }
}
