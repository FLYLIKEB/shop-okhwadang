import { describe, expect, it } from 'vitest';
import { englishBlockControls } from '../blockControls';

describe('English CMS controls', () => {
  it('uses saved English button text without changing editorial content or links', () => {
    const content = { title: '원문 제목', title_en: 'English title', cta_text: '보기', cta_text_en: 'View', cta_url: '/ko/products', slides: [{ title: '슬라이드', cta_text: '구매', cta_text_en: 'Shop' }] };
    expect(englishBlockControls(content)).toEqual({ ...content, cta_text: 'View', slides: [{ title: '슬라이드', cta_text: 'Shop', cta_text_en: 'Shop' }] });
    expect(content.cta_text).toBe('보기');
  });

  it('preserves original labels when no English translation is available', () => {
    const content = { button_text: '등록', button_text_en: ' ' };
    expect(englishBlockControls(content)).toEqual(content);
  });
});
