import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    const existing = await this.tierRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Tier name already exists: ${dto.name}`);
    }
    const tier = this.tierRepo.create({
      name: dto.name,
      minAmount: dto.minAmount,
      pointRate: dto.pointRate,
      benefitsJson: dto.benefitsJson ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.tierRepo.save(tier);
  }

  async updateTier(id: number, dto: UpdateMembershipTierDto): Promise<MembershipTier> {
    const tier = await this.findOneTier(id);
    if (dto.name && dto.name !== tier.name) {
      const existing = await this.tierRepo.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException(`Tier name already exists: ${dto.name}`);
      }
    }
    Object.assign(tier, {
      ...(dto.name !== undefined && { name: dto.name }),
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

    const tiers = await this.tierRepo.find({ order: { minAmount: 'ASC' } });
    const tierDetails = tiers.find((t) => t.name === user.tier) ?? null;
    const accumulated = Number(user.tierAccumulatedAmount);

    const nextTier =
      tiers.find((t) => Number(t.minAmount) > accumulated) ?? null;

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

  async incrementAccumulatedAmount(userId: number, amount: number): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'tierAccumulatedAmount', amount);
    this.logger.log(`[membership] Incremented tier_accumulated_amount for user ${userId} by ${amount}`);
  }

  // ─── Tier re-evaluation (called by Cron) ───────────────────────────────────

  async evaluateAllUserTiers(): Promise<void> {
    const tiers = await this.tierRepo.find({ order: { minAmount: 'DESC' } });
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
    const upgradeEvents: TierUpgradedEvent[] = [];

    for (const user of users) {
      const accumulated = Number(user.tierAccumulatedAmount);
      // tiers sorted DESC by minAmount — pick the first (highest) one the user qualifies for
      const appropriateTier = tiers.find((t) => accumulated >= Number(t.minAmount));
      if (!appropriateTier) continue;

      const previousTier = user.tier;

      if (appropriateTier.name !== previousTier) {
        const bucket =
          tierUpdates.get(appropriateTier.name) ??
          [];
        bucket.push(user.id);
        tierUpdates.set(appropriateTier.name, bucket);

        // Determine if this is an upgrade (new tier has higher minAmount than previous)
        const previousTierData = tiers.find((t) => t.name === previousTier);
        const newTierData = appropriateTier;
        const isUpgrade =
          Number(newTierData.minAmount) > Number(previousTierData?.minAmount ?? 0);

        if (isUpgrade) {
          upgradeEvents.push(
            new TierUpgradedEvent(Number(user.id), previousTier, appropriateTier.name),
          );
          upgradedCount++;
          this.logger.log(
            `[membership:cron] User ${user.id} upgraded: ${previousTier} → ${appropriateTier.name}`,
          );
        }
      } else {
        unchangedUserIds.push(user.id);
      }
    }

    await this.updateUsersInChunks(unchangedUserIds, { tierEvaluatedAt: evaluatedAt });
    for (const [tier, userIds] of tierUpdates) {
      await this.updateUsersInChunks(userIds, { tier, tierEvaluatedAt: evaluatedAt });
    }

    for (const event of upgradeEvents) {
      this.membershipEvents.emitTierUpgraded(event);
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
}
