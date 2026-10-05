import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  MessageEffectEventType,
  MessageEffectOutbox,
  MessageEffectState,
} from './entities/message-effect-outbox.entity';

export interface MessageEffectClaimOptions {
  owner: string;
  limit: number;
  maxAttempts: number;
  leaseMs: number;
  now?: Date;
}

@Injectable()
export class MessageEffectOutboxService {
  constructor(
    @InjectRepository(MessageEffectOutbox)
    private readonly repository: Repository<MessageEffectOutbox>,
  ) {}

  async enqueueWithManager(
    manager: EntityManager,
    orderId: number,
    eventType: MessageEffectEventType,
  ): Promise<MessageEffectOutbox> {
    const repository = manager.getRepository(MessageEffectOutbox);
    try {
      const result = await repository.insert({ orderId, eventType, state: MessageEffectState.PENDING });
      const id = Number(result.identifiers[0]?.id);
      const created = Number.isFinite(id) ? await repository.findOne({ where: { id } }) : null;
      if (created) return created;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    const existing = await repository.findOne({ where: { orderId, eventType } });
    if (!existing) throw new Error('Message effect outbox insert did not return a row');
    return existing;
  }

  async claimDue(options: MessageEffectClaimOptions): Promise<MessageEffectOutbox[]> {
    const now = options.now ?? new Date();
    await this.exhaustDueRetries(options.maxAttempts, now);
    const due = '(effect.state = :pending OR (effect.state = :failed AND (effect.nextAttemptAt IS NULL OR effect.nextAttemptAt <= :now)) OR (effect.state = :processing AND effect.leaseExpiresAt <= :now))';
    const states = { pending: MessageEffectState.PENDING, failed: MessageEffectState.FAILED, processing: MessageEffectState.PROCESSING, now };
    const candidates = await this.repository.createQueryBuilder('effect')
      .where(due, states)
      .andWhere('effect.attemptCount < :maxAttempts', { maxAttempts: options.maxAttempts })
      .orderBy('effect.id', 'ASC')
      .take(options.limit)
      .getMany();

    const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);
    const claimed: MessageEffectOutbox[] = [];
    for (const candidate of candidates) {
      const result = await this.repository.createQueryBuilder()
        .update(MessageEffectOutbox)
        .set({ state: MessageEffectState.PROCESSING, leaseOwner: options.owner, leaseExpiresAt, attemptCount: () => 'attempt_count + 1' })
        .where('id = :id', { id: candidate.id })
        .andWhere('attempt_count < :maxAttempts', { maxAttempts: options.maxAttempts })
        .andWhere('(state = :pending OR (state = :failed AND (next_attempt_at IS NULL OR next_attempt_at <= :now)) OR (state = :processing AND lease_expires_at <= :now))', states)
        .execute();
      if (result.affected === 1) claimed.push({
        ...candidate,
        state: MessageEffectState.PROCESSING,
        leaseOwner: options.owner,
        leaseExpiresAt,
        attemptCount: candidate.attemptCount + 1,
      });
    }
    return claimed;
  }

  async exhaustDueRetries(maxAttempts: number, now = new Date()): Promise<number> {
    const result = await this.repository.createQueryBuilder()
      .update(MessageEffectOutbox)
      .set({ state: MessageEffectState.MANUAL_REVIEW, leaseOwner: null, leaseExpiresAt: null, nextAttemptAt: null })
      .where('attempt_count >= :maxAttempts', { maxAttempts })
      .andWhere('(state = :pending OR (state = :failed AND (next_attempt_at IS NULL OR next_attempt_at <= :now)) OR (state = :processing AND lease_expires_at <= :now))', {
        pending: MessageEffectState.PENDING,
        failed: MessageEffectState.FAILED,
        processing: MessageEffectState.PROCESSING,
        now,
      })
      .execute();
    return result.affected ?? 0;
  }

  async markSucceeded(id: number, owner: string, processedAt = new Date()): Promise<boolean> {
    const result = await this.repository.update(
      { id, state: MessageEffectState.PROCESSING, leaseOwner: owner },
      { state: MessageEffectState.SUCCEEDED, processedAt, leaseOwner: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: null },
    );
    return result.affected === 1;
  }

  async markFailed(effect: MessageEffectOutbox, owner: string, maxAttempts: number, error: unknown, now = new Date()): Promise<boolean> {
    const manual = effect.attemptCount >= maxAttempts;
    const result = await this.repository.update(
      { id: effect.id, state: MessageEffectState.PROCESSING, leaseOwner: owner },
      {
        state: manual ? MessageEffectState.MANUAL_REVIEW : MessageEffectState.FAILED,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextAttemptAt: manual ? null : new Date(now.getTime() + backoffMs(effect.attemptCount)),
        lastError: errorName(error),
      },
    );
    return result.affected === 1;
  }

  async markManualReview(id: number, owner: string, error: unknown): Promise<boolean> {
    const result = await this.repository.update(
      { id, state: MessageEffectState.PROCESSING, leaseOwner: owner },
      { state: MessageEffectState.MANUAL_REVIEW, leaseOwner: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: errorName(error) },
    );
    return result.affected === 1;
  }
}

export function backoffMs(attempt: number): number {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY';
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'DeliveryError';
}
