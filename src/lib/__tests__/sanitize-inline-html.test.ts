import { describe, expect, it } from 'vitest';
import { sanitizeInlineHtml } from '@/lib/sanitize-inline-html';

describe('sanitizeInlineHtml', () => {
  it('keeps simple emphasis tags for admin-authored inline copy', () => {
    expect(sanitizeInlineHtml('주철질의 <b>대표 니료</b>입니다.')).toBe(
      '주철질의 <b>대표 니료</b>입니다.',
    );
  });

  it('removes scripts, event handlers, and unsupported tags', () => {
    const sanitized = sanitizeInlineHtml(
      '<img src=x onerror=alert(1)>안전한 <strong onclick="alert(1)">강조</strong><script>alert(1)</script>',
    );

    expect(sanitized).toBe('안전한 <strong>강조</strong>');
  });
});
