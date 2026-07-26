import { describe, expect, it } from 'vitest';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';

const REQUIRED_KEYS = [
  'review_reward_earn',
  'review_reward_revoke',
  'order_use',
  'expiry',
  'order_restore',
  'manual_grant',
  'manual_debit',
] as const;

describe('admin points sourceKind locale coverage', () => {
  it('defines exact sourceKind labels in ko and en locale bundles', () => {
    const koKinds = (ko as { admin: { points: { sourceKinds: Record<string, string> } } }).admin.points.sourceKinds;
    const enKinds = (en as { admin: { points: { sourceKinds: Record<string, string> } } }).admin.points.sourceKinds;

    for (const key of REQUIRED_KEYS) {
      expect(koKinds[key]).toBeTruthy();
      expect(enKinds[key]).toBeTruthy();
    }
  });
});
