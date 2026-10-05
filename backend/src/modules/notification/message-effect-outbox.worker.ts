import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { AmbiguousMessageDeliveryError } from './interfaces/message-provider.interface';
import { MessageEffectEventType } from './entities/message-effect-outbox.entity';
import { MessageEffectOutboxService } from './message-effect-outbox.service';

export const MESSAGE_EFFECT_DELIVERY = Symbol('MESSAGE_EFFECT_DELIVERY');

export interface MessageEffectDelivery {
  deliver(orderId: number, eventType: MessageEffectEventType, effectKey: string): Promise<void>;
}

export interface MessageEffectWorkerOptions {
  owner: string;
  batchSize: number;
  maxAttempts: number;
  leaseMs: number;
}

@Injectable()
export class MessageEffectOutboxWorker {
  private draining = false;

  constructor(
    private readonly outbox: MessageEffectOutboxService,
    @Inject(MESSAGE_EFFECT_DELIVERY) private readonly delivery: MessageEffectDelivery,
  ) {}

  async drain(options: MessageEffectWorkerOptions): Promise<number> {
    const effects = await this.outbox.claimDue({ owner: options.owner, limit: options.batchSize, maxAttempts: options.maxAttempts, leaseMs: options.leaseMs });
    for (const effect of effects) {
      try {
        await this.delivery.deliver(effect.orderId, effect.eventType, `message-effect:${effect.id}`);
        await this.outbox.markSucceeded(effect.id, options.owner);
      } catch (error) {
        if (error instanceof AmbiguousMessageDeliveryError) await this.outbox.markManualReview(effect.id, options.owner, error);
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
      await this.drain({ owner: randomUUID(), batchSize: 25, maxAttempts: 8, leaseMs: 5 * 60 * 1000 });
    } finally {
      this.draining = false;
    }
  }
}
