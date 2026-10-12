import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { MembershipTier } from './entities/membership-tier.entity';
import { User } from '../users/entities/user.entity';
import { CreateMembershipTierDto } from './dto/create-membership-tier.dto';
import { UpdateMembershipTierDto } from './dto/update-membership-tier.dto';
import { MembershipEventEmitter } from './membership-event.emitter';
import { TierUpgradedEvent } from './events/tier-upgraded.event';

export interface UserTierInfo {
  tier: string;
  tierAccumulatedAmount: number;
  tierEvaluatedAt: Date | null;
  tierDetails: MembershipTier | null;
  nextTier: MembershipTier | null;
  amountToNextTier: number | null;
}

const USER_TIER_BATCH_SIZE = 500;
const DECIMAL_14_2_MAX = 999999999999.99;
const DECIMAL_5_2_MAX = 999.99;
const INT32_MAX = 2147483647;

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @InjectRepository(MembershipTier)
    private readonly tierRepo: Repository<MembershipTier>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly membershipEvents: MembershipEventEmitter,
  ) {}

  // ─── Admin CRUD ────────────────────────────────────────────────────────────

  async findAllTiers(): Promise<MembershipTier[]> {
    return this.tierRepo.find({ order: { sortOrder: 'ASC', minAmount: 'ASC' } });
  }

  async findOneTier(id: number): Promise<MembershipTier> {
    const tier = await this.tierRepo.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Membership tier not found: ${id}`);
    }
    return tier;
  }

  async createTier(dto: CreateMembershipTierDto): Promise<MembershipTier> {
    const name = this.normalizeTierName(dto.name);
    this.assertTierValues({
      minAmount: dto.minAmount,
      pointRate: dto.pointRate,
      sortOrder: dto.sortOrder,
    });
    const existing = await this.tierRepo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Tier name already exists: ${name}`);
    }
    const tier = this.tierRepo.create({
      name,
      minAmount: dto.minAmount,
      pointRate: dto.pointRate,
      benefitsJson: dto.benefitsJson ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
    try {
      return await this.tierRepo.save(tier);
    } catch (err) {
      if (this.isDuplicateTierNameError(err)) {
        throw new ConflictException(`Tier name already exists: ${name}`);
      }
      throw err;
    }
  }

  async updateTier(id: number, dto: UpdateMembershipTierDto): Promise<MembershipTier> {
    const tier = await this.findOneTier(id);
    if (dto.name !== undefined && this.normalizeTierName(dto.name) !== tier.name) {
      throw new BadRequestException('회원 등급명은 안정 식별자라 변경할 수 없습니다.');
    }
    this.assertTierValues({
      minAmount: dto.minAmount,
      pointRate: dto.pointRate,
      sortOrder: dto.sortOrder,
    });
    Object.assign(tier, {
      ...(dto.minAmount !== undefined && { minAmount: dto.minAmount }),
      ...(dto.pointRate !== undefined && { pointRate: dto.pointRate }),
      ...(dto.benefitsJson !== undefined && { benefitsJson: dto.benefitsJson }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });
    return this.tierRepo.save(tier);
  }

  // ─── User tier info ─────────────────────────────────────────────────────────

  async getUserTierInfo(userId: number): Promise<UserTierInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tiers = this.sortTiersAscending(await this.tierRepo.find({ order: { minAmount: 'ASC' } }));
    const tierDetails = tiers.find((t) => t.name === user.tier) ?? null;
    const accumulated = Number(user.tierAccumulatedAmount);

    const currentMinAmount = tierDetails ? Number(tierDetails.minAmount) : null;
    const nextTier = currentMinAmount !== null
      ? tiers.find((t) => Number(t.minAmount) > currentMinAmount) ?? null
      : tiers.find((t) => Number(t.minAmount) > accumulated) ?? null;

    const amountToNextTier =
      nextTier !== null ? Math.max(0, Number(nextTier.minAmount) - accumulated) : null;

    return {
      tier: user.tier,
      tierAccumulatedAmount: accumulated,
      tierEvaluatedAt: user.tierEvaluatedAt,
      tierDetails,
      nextTier,
      amountToNextTier,
    };
  }

  // ─── Order completion hook ──────────────────────────────────────────────────

  async incrementAccumulatedAmount(userId: number, amount: number, manager?: EntityManager): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    if (manager) {
      await manager.increment(User, { id: userId }, 'tierAccumulatedAmount', amount);
    } else {
      await this.userRepo.increment({ id: userId }, 'tierAccumulatedAmount', amount);
    }
    this.logger.log(`[membership] Incremented tier_accumulated_amount for user ${userId} by ${amount}`);
  }

  getCompletedOrderAccrualAmount(order: {
    totalAmount: number | string;
  }): number {
    return Math.max(0, Number(order.totalAmount));
  }

  // ─── Tier re-evaluation (called by Cron) ───────────────────────────────────

  async evaluateAllUserTiers(): Promise<void> {
    const tiers = this.sortTiersAscending(await this.tierRepo.find({ order: { minAmount: 'ASC' } }));
    if (tiers.length === 0) {
      this.logger.warn('[membership:cron] No tiers configured, skipping evaluation');
      return;
    }

    const users = await this.userRepo.find({
      select: {
        id: true,
        tier: true,
        tierAccumulatedAmount: true,
        isActive: true,
      },
      where: { isActive: true },
    });
    this.logger.log(`[membership:cron] Evaluating tiers for ${users.length} users`);

    let upgradedCount = 0;
    const evaluatedAt = new Date();
    const unchangedUserIds: number[] = [];
    const tierUpdates = new Map<string, number[]>();

    for (const user of users) {
      const accumulated = Number(user.tierAccumulatedAmount);
      const appropriateTier = this.resolveAppropriateTier(tiers, accumulated, user.tier);
      if (!appropriateTier) continue;

      const previousTier = user.tier;

      if (appropriateTier.name !== previousTier) {
        const bucket =
          tierUpdates.get(appropriateTier.name) ??
          [];
        const previousTierData = tiers.find((t) => t.name === previousTier);
        const newTierData = appropriateTier;
        const isUpgrade =
          Number(newTierData.minAmount) > Number(previousTierData?.minAmount ?? 0);

        if (isUpgrade) {
          try {
            await this.membershipEvents.emitTierUpgraded(
              new TierUpgradedEvent(Number(user.id), previousTier, appropriateTier.name),
            );
          } catch (err) {
            this.logger.warn(
              `[membership:cron] Tier-up side effects failed for user ${user.id}: ${String(err)}`,
            );
            continue;
          }
          upgradedCount++;
          this.logger.log(
            `[membership:cron] User ${user.id} upgraded: ${previousTier} → ${appropriateTier.name}`,
          );
        }

        bucket.push(user.id);
        tierUpdates.set(appropriateTier.name, bucket);
      } else {
        unchangedUserIds.push(user.id);
      }
    }

    await this.updateUsersInChunks(unchangedUserIds, { tierEvaluatedAt: evaluatedAt });
    for (const [tier, userIds] of tierUpdates) {
      await this.updateUsersInChunks(userIds, { tier, tierEvaluatedAt: evaluatedAt });
    }

    this.logger.log(`[membership:cron] Evaluation complete. Upgraded: ${upgradedCount}/${users.length}`);
  }

  private async updateUsersInChunks(
    userIds: number[],
    values: Partial<Pick<User, 'tier' | 'tierEvaluatedAt'>>,
  ): Promise<void> {
    for (let index = 0; index < userIds.length; index += USER_TIER_BATCH_SIZE) {
      const chunk = userIds.slice(index, index + USER_TIER_BATCH_SIZE);
      if (chunk.length > 0) {
        await this.userRepo.update({ id: In(chunk) }, values);
      }
    }
  }

  private normalizeTierName(name: unknown): string {
    if (typeof name !== 'string') {
      throw new BadRequestException('회원 등급명은 문자열이어야 합니다.');
    }
    const normalized = name.trim();
    if (normalized.length === 0 || normalized.length > 50) {
      throw new BadRequestException('회원 등급명은 1자 이상 50자 이하로 입력해야 합니다.');
    }
    return normalized;
  }

  private assertTierValues(values: {
    minAmount?: number;
    pointRate?: number;
    sortOrder?: number;
  }): void {
    if (values.minAmount !== undefined && (!Number.isFinite(values.minAmount) || values.minAmount < 0 || values.minAmount > DECIMAL_14_2_MAX)) {
      throw new BadRequestException('최소 누적 구매 금액이 올바르지 않습니다.');
    }
    if (values.pointRate !== undefined && (!Number.isFinite(values.pointRate) || values.pointRate < 0 || values.pointRate > DECIMAL_5_2_MAX)) {
      throw new BadRequestException('포인트 적립률이 올바르지 않습니다.');
    }
    if (values.sortOrder !== undefined && (!Number.isInteger(values.sortOrder) || values.sortOrder < 0 || values.sortOrder > INT32_MAX)) {
      throw new BadRequestException('정렬 순서는 0 이상의 정수여야 합니다.');
    }
  }

  private sortTiersAscending(tiers: MembershipTier[]): MembershipTier[] {
    return [...tiers].sort((a, b) => {
      const minAmountDiff = Number(a.minAmount) - Number(b.minAmount);
      if (minAmountDiff !== 0) return minAmountDiff;
      const sortOrderDiff = Number(a.sortOrder) - Number(b.sortOrder);
      if (sortOrderDiff !== 0) return sortOrderDiff;
      return a.name.localeCompare(b.name);
    });
  }

  private resolveAppropriateTier(
    ascendingTiers: MembershipTier[],
    accumulated: number,
    currentTierName: string,
  ): MembershipTier | null {
    const eligible = ascendingTiers.filter((tier) => accumulated >= Number(tier.minAmount));
    if (eligible.length === 0) return null;

    const highestMinAmount = Math.max(...eligible.map((tier) => Number(tier.minAmount)));
    const highestTiers = eligible.filter((tier) => Number(tier.minAmount) === highestMinAmount);
    return highestTiers.find((tier) => tier.name === currentTierName) ?? highestTiers[0];
  }

  private isDuplicateTierNameError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const maybeError = err as { code?: unknown; errno?: unknown; driverError?: { code?: unknown; errno?: unknown } };
    return (
      maybeError.code === 'ER_DUP_ENTRY' ||
      maybeError.errno === 1062 ||
      maybeError.driverError?.code === 'ER_DUP_ENTRY' ||
      maybeError.driverError?.errno === 1062
    );
  }
}
