import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { Brackets, DataSource, Repository } from 'typeorm';
import {
  PaymentWebhookEvent,
  PaymentWebhookResult,
  PaymentWebhookState,
} from '../entities/payment-webhook-event.entity';

export interface ClaimedPaymentWebhookReceipt {
  id: number;
  owner: string;
}

export interface PaymentWebhookReceiptWorkerDependencies {
  repository: Repository<PaymentWebhookEvent>;
  dataSource: DataSource;
  /** Must verify the exact bytes stored in the receipt, not a request body. */
  verify: (rawBody: Buffer, signatureValue: string, receipt: PaymentWebhookEvent) => Promise<boolean>;
  /** Runs domain mutation inside the receipt's owner-fenced transaction. */
  apply: (metadata: object, manager: Parameters<DataSource['transaction']>[0] extends (manager: infer M) => unknown ? M : never) => Promise<PaymentWebhookResult>;
  now?: () => Date;
  leaseMs?: number;
}

@Injectable()
export class PaymentWebhookReceiptWorkerService {
  private readonly now: () => Date;
  private readonly leaseMs: number;
  private draining = false;

  constructor(private readonly deps: PaymentWebhookReceiptWorkerDependencies) {
    this.now = deps.now ?? (() => new Date());
    this.leaseMs = deps.leaseMs ?? 5 * 60 * 1000;
  }

  async claim(id: number): Promise<ClaimedPaymentWebhookReceipt | null> {
    const now = this.now();
    const owner = randomUUID();
    const affected = await this.deps.repository.createQueryBuilder()
      .update(PaymentWebhookEvent)
      .set({
        state: PaymentWebhookState.PROCESSING,
        leaseOwner: owner,
        leaseExpiresAt: new Date(now.getTime() + this.leaseMs),
        processingStartedAt: now,
        nextAttemptAt: null,
        attemptCount: () => '`attempt_count` + 1',
        replayCount: () => '`replay_count` + 1',
        replayedAt: now,
      })
      .where('id = :id', { id })
      .andWhere('replayable = :replayable', { replayable: true })
      .andWhere(new Brackets((where) => where
        .where("state = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= :now) AND attempt_count < max_attempts", { now })
        .orWhere("state = 'processing' AND lease_expires_at < :now", { now })))
      .execute();
    return affected.affected === 1 ? { id, owner } : null;
  }

  async processClaimed(claim: ClaimedPaymentWebhookReceipt): Promise<boolean> {
    const receipt = await this.deps.repository.findOne({ where: { id: claim.id } });
    if (!receipt || receipt.state !== PaymentWebhookState.PROCESSING || receipt.leaseOwner !== claim.owner) return false;
    if (!receipt.replayable || !receipt.rawBody || !receipt.signatureValue || !receipt.normalizedMetadata) {
      await this.manualReview(claim, 'Receipt is missing immutable signed evidence.');
      return false;
    }
    if (!(await this.deps.verify(receipt.rawBody, receipt.signatureValue, receipt))) {
      await this.manualReview(claim, 'Stored webhook signature verification failed.');
      return false;
    }

    try {
      let completed = false;
      await this.deps.dataSource.transaction(async (manager) => {
        const locked = await manager.findOne(PaymentWebhookEvent, {
          where: { id: claim.id }, lock: { mode: 'pessimistic_write' },
        });
        if (!locked || locked.state !== PaymentWebhookState.PROCESSING || locked.leaseOwner !== claim.owner) return;
        const result = await this.deps.apply(
          { ...(locked.normalizedMetadata as Record<string, unknown>), providerRoute: locked.providerRoute },
          manager as never,
        );
        const state = result === PaymentWebhookResult.SUCCESS
          ? PaymentWebhookState.SUCCEEDED : PaymentWebhookState.IGNORED;
        const updated = await manager.createQueryBuilder()
          .update(PaymentWebhookEvent)
          .set({ state, result, processedAt: this.now(), leaseOwner: null, leaseExpiresAt: null, lastError: null })
          .where('id = :id AND state = :state AND lease_owner = :owner', {
            id: claim.id, state: PaymentWebhookState.PROCESSING, owner: claim.owner,
          }).execute();
        completed = updated.affected === 1;
        if (!completed) throw new Error('Webhook receipt lease ownership was lost.');
      });
      return completed;
    } catch (error) {
      await this.fail(claim, error);
      return false;
    }
  }

  async fail(claim: ClaimedPaymentWebhookReceipt, error: unknown): Promise<boolean> {
    const receipt = await this.deps.repository.findOne({ where: { id: claim.id } });
    if (!receipt || receipt.state !== PaymentWebhookState.PROCESSING || receipt.leaseOwner !== claim.owner) return false;
    const lastError = error instanceof Error ? error.message : String(error);
    const exhausted = receipt.attemptCount >= receipt.maxAttempts;
    const updated = await this.deps.repository.update(
      { id: claim.id, state: PaymentWebhookState.PROCESSING, leaseOwner: claim.owner },
      exhausted
        ? { state: PaymentWebhookState.MANUAL_REVIEW, result: PaymentWebhookResult.FAILED, processedAt: this.now(), leaseOwner: null, leaseExpiresAt: null, lastError }
        : { state: PaymentWebhookState.PENDING, result: PaymentWebhookResult.FAILED, leaseOwner: null, leaseExpiresAt: null, lastError, nextAttemptAt: new Date(this.now().getTime() + this.backoff(receipt.attemptCount)) },
    );
    return updated.affected === 1;
  }

  async processDue(limit = 25): Promise<number> {
    const now = this.now();
    const receipts = await this.deps.repository.createQueryBuilder('receipt')
      .where("receipt.replayable = 1 AND ((receipt.state = 'pending' AND (receipt.next_attempt_at IS NULL OR receipt.next_attempt_at <= :now) AND receipt.attempt_count < receipt.max_attempts) OR (receipt.state = 'processing' AND receipt.lease_expires_at < :now))", { now })
      .orderBy('receipt.received_at', 'ASC').take(limit).getMany();
    let processed = 0;
    for (const receipt of receipts) {
      const claim = await this.claim(receipt.id);
      if (claim && await this.processClaimed(claim)) processed += 1;
    }
    return processed;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async drainScheduled(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      await this.processDue();
    } finally {
      this.draining = false;
    }
  }

  private async manualReview(claim: ClaimedPaymentWebhookReceipt, lastError: string): Promise<void> {
    await this.deps.repository.update(
      { id: claim.id, state: PaymentWebhookState.PROCESSING, leaseOwner: claim.owner },
      { state: PaymentWebhookState.MANUAL_REVIEW, result: PaymentWebhookResult.FAILED, processedAt: this.now(), leaseOwner: null, leaseExpiresAt: null, lastError },
    );
  }

  private backoff(attempt: number): number {
    return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
  }
}
