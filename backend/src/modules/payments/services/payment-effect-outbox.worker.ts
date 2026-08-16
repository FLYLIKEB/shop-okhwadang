import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PaymentEffectOutbox, PaymentEffectType } from '../entities/payment-effect-outbox.entity';
import { PaymentEffectOutboxService } from './payment-effect-outbox.service';
import { AmbiguousMessageDeliveryError, MessageDeliveryInProgressError } from '../../notification/interfaces/message-provider.interface';

export interface PaymentEffectCollaborators {
  orderCompleted: { deliver(payload: Record<string, unknown>, idempotencyKey: string): Promise<void> };
  paymentConfirmedNotification: { deliver(payload: Record<string, unknown>, idempotencyKey: string): Promise<void> };
  memberMessageNotification: { deliver(payload: Record<string, unknown>, idempotencyKey: string): Promise<void> };
}

export interface PaymentEffectWorkerOptions {
  owner: string;
  batchSize: number;
  maxAttempts: number;
  leaseMs: number;
}

@Injectable()
export class PaymentEffectOutboxWorker {
  private draining = false;
  constructor(
    private readonly outbox: PaymentEffectOutboxService,
    private readonly collaborators: PaymentEffectCollaborators,
  ) {}

  async drain(options: PaymentEffectWorkerOptions): Promise<number> {
    const effects = await this.outbox.claimDue({
      owner: options.owner,
      limit: options.batchSize,
      maxAttempts: options.maxAttempts,
      leaseMs: options.leaseMs,
    });
    for (const effect of effects) {
      try {
        await this.dispatch(effect);
        await this.outbox.markSucceeded(effect.id, options.owner);
      } catch (error) {
        if (error instanceof AmbiguousMessageDeliveryError) await this.outbox.markManualReview(effect.id, options.owner, error);
        else if (error instanceof MessageDeliveryInProgressError) await this.outbox.markFailed(effect, options.owner, options.maxAttempts, error);
        else await this.outbox.markFailed(effect, options.owner, options.maxAttempts, error);
      }
    }
    return effects.length;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async drainScheduled(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      await this.drain({
        owner: randomUUID(),
        batchSize: 25,
        maxAttempts: 8,
        leaseMs: 5 * 60 * 1000,
      });
    } finally {
      this.draining = false;
    }
  }

  private async dispatch(effect: PaymentEffectOutbox): Promise<void> {
    const payload = clonePayload(effect.payload);
    const idempotencyKey = `payment-effect:${effect.id}`;
    switch (effect.effectType) {
      case PaymentEffectType.ORDER_COMPLETED_EVENT:
        return this.collaborators.orderCompleted.deliver(payload, idempotencyKey);
      case PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION:
        return this.collaborators.paymentConfirmedNotification.deliver(payload, idempotencyKey);
      case PaymentEffectType.MEMBER_MESSAGE_NOTIFICATION:
        return this.collaborators.memberMessageNotification.deliver(payload, idempotencyKey);
      default:
        throw new Error(`Unsupported payment effect type: ${effect.effectType}`);
    }
  }
}

function clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}
