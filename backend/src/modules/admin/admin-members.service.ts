import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { AdminMembersQueryDto } from './dto/admin-members-query.dto';

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class AdminMembersService {
  private readonly logger = new Logger(AdminMembersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(query: AdminMembersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (query.q) {
      qb.andWhere(
        '(user.email LIKE :q OR user.name LIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.is_active });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      items: users.map(toSafeUser),
      total,
      page,
      limit,
    };
  }

  async updateRole(
    targetId: number,
    newRole: UserRole,
    requesterId: number,
    requesterRole: UserRole,
  ): Promise<SafeUser> {
    if (targetId === requesterId) {
      throw new BadRequestException('자기 자신의 역할은 변경할 수 없습니다.');
    }

    const target = await this.userRepository.findOne({ where: { id: targetId } });
    if (!target) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    if (!target.isActive) {
      throw new BadRequestException('비활성 회원의 역할은 변경할 수 없습니다.');
    }

    // Permission matrix: admin cannot grant/revoke super_admin
    if (requesterRole === UserRole.ADMIN) {
      if (newRole === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('super_admin 역할 부여는 super_admin만 가능합니다.');
      }
      if (target.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('super_admin의 역할 변경은 super_admin만 가능합니다.');
      }
    }

    // Prevent last super_admin demotion
    if (target.role === UserRole.SUPER_ADMIN && newRole !== UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException('최소 1명의 super_admin이 유지되어야 합니다.');
      }
    }

    await this.userRepository.update(targetId, { role: newRole });

    this.logger.log(
      `Member #${targetId} role changed: ${target.role} → ${newRole} by #${requesterId}`,
    );

    const updated = await this.userRepository.findOne({ where: { id: targetId } });
    return toSafeUser(updated!);
  }
}
