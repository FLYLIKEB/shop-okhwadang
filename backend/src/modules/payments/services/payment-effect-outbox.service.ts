import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  PaymentEffectOutbox,
  PaymentEffectState,
  PaymentEffectType,
} from '../entities/payment-effect-outbox.entity';

export interface PaymentEffectClaimOptions {
  owner: string;
  limit: number;
  maxAttempts: number;
  leaseMs: number;
  now?: Date;
}

@Injectable()
export class PaymentEffectOutboxService {
  constructor(
    @InjectRepository(PaymentEffectOutbox)
    private readonly repository: Repository<PaymentEffectOutbox>,
  ) {}

  async enqueueWithManager(
    manager: EntityManager,
    orderId: number,
    effectType: PaymentEffectType,
    payload: Record<string, unknown>,
  ): Promise<PaymentEffectOutbox> {
    const repository = manager.getRepository(PaymentEffectOutbox);
    const immutablePayload = cloneJson(payload);
    try {
      const result = await repository.insert(
        {
          orderId,
          effectType,
          payload: immutablePayload,
          evidence: immutablePayload,
          state: PaymentEffectState.PENDING,
          attemptCount: 0,
          nextAttemptAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: null,
          processedAt: null,
        } as never,
      );
      const id = Number(result.identifiers[0]?.id);
      const created = Number.isFinite(id) ? await repository.findOne({ where: { id } }) : null;
      if (created) return created;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }

    const existing = await repository.findOne({ where: { orderId, effectType } });
    if (!existing) throw new Error('Payment effect outbox insert did not return a row');
    return existing;
  }

  async claimDue(options: PaymentEffectClaimOptions): Promise<PaymentEffectOutbox[]> {
    const now = options.now ?? new Date();
    const candidates = await this.repository
      .createQueryBuilder('effect')
      .where(
        `(effect.state = :pending OR (effect.state = :failed AND (effect.nextAttemptAt IS NULL OR effect.nextAttemptAt <= :now)) OR (effect.state = :processing AND effect.leaseExpiresAt <= :now))`,
        {
          pending: PaymentEffectState.PENDING,
          failed: PaymentEffectState.FAILED,
          processing: PaymentEffectState.PROCESSING,
          now,
        },
      )
      .andWhere('effect.attemptCount < :maxAttempts', { maxAttempts: options.maxAttempts })
      .orderBy('effect.id', 'ASC')
      .take(options.limit)
      .getMany();

    const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);
    const claimed: PaymentEffectOutbox[] = [];
    for (const candidate of candidates) {
      const update = await this.repository
        .createQueryBuilder()
        .update(PaymentEffectOutbox)
        .set({
          state: PaymentEffectState.PROCESSING,
          leaseOwner: options.owner,
          leaseExpiresAt,
          attemptCount: () => 'attempt_count + 1',
        })
        .where('id = :id', { id: candidate.id })
        .andWhere('attempt_count < :maxAttempts', { maxAttempts: options.maxAttempts })
        .andWhere(
          `(state = :pending OR (state = :failed AND (next_attempt_at IS NULL OR next_attempt_at <= :now)) OR (state = :processing AND lease_expires_at <= :now))`,
          {
            pending: PaymentEffectState.PENDING,
            failed: PaymentEffectState.FAILED,
            processing: PaymentEffectState.PROCESSING,
            now,
          },
        )
        .execute();
      if (update.affected === 1) {
        claimed.push({
          ...candidate,
          state: PaymentEffectState.PROCESSING,
          leaseOwner: options.owner,
          leaseExpiresAt,
          attemptCount: candidate.attemptCount + 1,
        });
      }
    }
    return claimed;
  }

  async markSucceeded(id: number, owner: string, processedAt = new Date()): Promise<boolean> {
    const result = await this.repository.update(
      { id, state: PaymentEffectState.PROCESSING, leaseOwner: owner },
      {
        state: PaymentEffectState.SUCCEEDED,
        processedAt,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        lastError: null,
      },
    );
    return result.affected === 1;
  }

  async markFailed(
    effect: PaymentEffectOutbox,
    owner: string,
    maxAttempts: number,
    error: unknown,
    now = new Date(),
  ): Promise<boolean> {
    const manual = effect.attemptCount >= maxAttempts;
    const result = await this.repository.update(
      { id: effect.id, state: PaymentEffectState.PROCESSING, leaseOwner: owner },
      {
        state: manual ? PaymentEffectState.MANUAL_REVIEW : PaymentEffectState.FAILED,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: manual ? null : new Date(now.getTime() + backoffMs(effect.attemptCount)),
        lastError: errorText(error),
      },
    );
    return result.affected === 1;
  }

  async markManualReview(id: number, owner: string, error: unknown): Promise<boolean> {
    const result = await this.repository.update({ id, state: PaymentEffectState.PROCESSING, leaseOwner: owner }, { state: PaymentEffectState.MANUAL_REVIEW, leaseOwner: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: errorText(error) });
    return result.affected === 1;
  }
}

export function backoffMs(attempt: number): number {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
}

function cloneJson(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY';
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
