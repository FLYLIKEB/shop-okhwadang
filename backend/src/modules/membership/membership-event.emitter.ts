import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { TierUpgradedEvent, TIER_UPGRADED_EVENT } from './events/tier-upgraded.event';

/**
 * MembershipEventEmitter
 *
 * Lightweight event bus for membership tier events.
 * Export this from MembershipModule so other modules (e.g. issue #514)
 * can subscribe to tier-up events without circular dependencies.
 *
 * Usage in subscriber:
 *   constructor(private readonly membershipEvents: MembershipEventEmitter) {
 *     this.membershipEvents.onTierUpgraded((event) => { ... });
 *   }
 */
@Injectable()
export class MembershipEventEmitter {
  private readonly emitter = new EventEmitter();

  async emitTierUpgraded(event: TierUpgradedEvent): Promise<void> {
    const handlers = this.emitter.listeners(TIER_UPGRADED_EVENT) as Array<
      (event: TierUpgradedEvent) => void | Promise<void>
    >;
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  onTierUpgraded(handler: (event: TierUpgradedEvent) => void | Promise<void>): void {
    this.emitter.on(TIER_UPGRADED_EVENT, handler);
  }
}
