/**
 * TierUpgradedEvent
 *
 * Emitted via MembershipEventEmitter when a user's membership tier is upgraded
 * during the monthly cron re-evaluation.
 *
 * Issue #514 (coupon auto-issuance) should inject MembershipEventEmitter and
 * call `onTierUpgraded(handler)` to subscribe to this event.
 */
export class TierUpgradedEvent {
  constructor(
    public readonly userId: number,
    public readonly previousTier: string,
    public readonly newTier: string,
  ) {}
}

export const TIER_UPGRADED_EVENT = 'membership.tier_upgraded';
