import { describe, expect, it } from 'vitest';
import { compactDisplayLabel, compactProductSummary } from '@/lib/collectionDisplay';

describe('collection display compaction', () => {
  it('removes redundant collection suffixes from filter labels', () => {
    expect(compactDisplayLabel('Jooni Collection')).toBe('Jooni');
    expect(compactDisplayLabel('Byeonpyeong Collection')).toBe('Byeonpyeong');
    expect(compactDisplayLabel('청수니 컬렉션')).toBe('청수니');
  });

  it('keeps meaningful parenthetical details while removing suffix-only wording', () => {
    expect(compactDisplayLabel('Heini (Black Clay)')).toBe('Heini (Black Clay)');
  });

  it('shortens product summaries without changing semantic parts', () => {
    expect(compactProductSummary('Fujian Zhuni · Xishi Shape · 120ml · Gongfu Tea')).toBe('Fujian Zhuni · Xishi · 120ml · Gongfu Tea');
    expect(compactProductSummary('Yixing Zisha · Flat shape · 200ml')).toBe('Yixing Zisha · Flat · 200ml');
  });
});
