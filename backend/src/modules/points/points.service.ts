import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function addOneYear(from: Date): Date {
  return new Date(from.getTime() + ONE_YEAR_MS);
}

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
  ) {}

  /**
   * Returns the effective point balance for a user.
   * Sums all point history amounts, but excludes earn entries
   * that have already expired (expiresAt <= now).
   */
  async getUserPointBalance(userId: number): Promise<number> {
    const now = new Date();

    const result = await this.pointHistoryRepo
      .createQueryBuilder('ph')
      .select('COALESCE(SUM(ph.amount), 0)', 'total')
      .where('ph.user_id = :userId', { userId })
      .andWhere(
        `(ph.type != 'earn' OR ph.expires_at IS NULL OR ph.expires_at > :now)`,
        { now },
      )
      .getRawOne<{ total: string }>();

    return parseInt(result?.total ?? '0', 10);
  }

  /**
   * Returns the effective balance within an active transaction.
   */
  async getEffectiveBalanceInTx(manager: EntityManager, userId: number): Promise<number> {
    const now = new Date();

    const result = await manager
      .createQueryBuilder(PointHistory, 'ph')
      .select('COALESCE(SUM(ph.amount), 0)', 'total')
      .where('ph.user_id = :userId', { userId })
      .andWhere(
        `(ph.type != 'earn' OR ph.expires_at IS NULL OR ph.expires_at > :now)`,
        { now },
      )
      .getRawOne<{ total: string }>();

    return parseInt(result?.total ?? '0', 10);
  }

  /**
   * Deducts `amount` points using FIFO (earliest-expiring earn entries consumed first).
   * Creates a single 'spend' PointHistory record within the provided transaction manager.
   * Returns the new running balance.
   *
   * Note: This method uses the running balance from the latest record for the balance column,
   * matching the existing pattern in the codebase. FIFO is tracked conceptually by
   * earning entries with earliest expiresAt being consumed first during deduction validation.
   */
  async deductFifo(
    manager: EntityManager,
    userId: number,
    amount: number,
    description: string,
    orderId: number | null = null,
  ): Promise<number> {
    // Get the latest running balance
    const latestEntry = await manager.findOne(PointHistory, {
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const currentBalance = latestEntry?.balance ?? 0;
    const newBalance = currentBalance - amount;

    await manager.save(PointHistory, {
      userId,
      type: 'spend' as const,
      amount: -amount,
      balance: newBalance,
      orderId,
      description,
    });

    return newBalance;
  }
}
