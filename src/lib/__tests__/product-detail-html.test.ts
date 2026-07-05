import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';
import { hasEmbeddedDetailMedia, sanitizeProductDetailHtml } from '@/lib/product-detail-html';

describe('sanitizeProductDetailHtml', () => {
  it('preserves SmartEditor structure, alignment, font classes, styles, images, and video embeds', () => {
    const sanitized = sanitizeProductDetailHtml(
      DOMPurify,
      `
        <div class="se-viewer se-theme-default" lang="ko-KR">
          <div class="se-main-container">
            <div class="se-section se-section-align-center"><hr class="se-hr"></div>
            <p class="se-text-paragraph se-text-paragraph-align-center" style="line-height:1.8; color:#823f00" id="SE-text">
              <span class="se-fs-fs19 se-ff-system" style="color:#823f00"><b>연자호</b></span>
            </p>
            <img src="https://shop-phinf.pstatic.net/example.jpg" alt="detail" class="se-image-resource">
            <iframe src="https://www.youtube.com/embed/example" title="video"></iframe>
          </div>
        </div>
      `,
    );

    const template = document.createElement('template');
    template.innerHTML = sanitized;

    expect(template.content.querySelector('.se-viewer')).toBeTruthy();
    expect(template.content.querySelector('.se-text-paragraph-align-center')).toBeTruthy();
    expect(template.content.querySelector('.se-fs-fs19')).toBeTruthy();
    expect(template.content.querySelector('.se-hr')).toBeTruthy();
    expect(template.content.querySelector('img')?.getAttribute('src')).toBe(
      'https://shop-phinf.pstatic.net/example.jpg',
    );
    expect(template.content.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/example',
    );
    expect(template.content.querySelector('iframe')?.getAttribute('loading')).toBe('lazy');
    expect(template.content.querySelector('p')?.getAttribute('style')).toContain(
      'line-height: 1.8',
    );
    expect(template.content.querySelector('span')?.getAttribute('style')).toContain(
      'color: #823f00',
    );
  });

  it('strips scripts, unsafe URLs, and URL-based inline CSS while retaining safe text styling', () => {
    const sanitized = sanitizeProductDetailHtml(
      DOMPurify,
      `
        <script>window.bad = true</script>
        <img src="javascript:alert(1)" alt="bad">
        <p style="background-image:url(javascript:alert(1)); color:#000000; line-height:1.8">safe</p>
      `,
    );

    const template = document.createElement('template');
    template.innerHTML = sanitized;

    expect(template.content.querySelector('script')).toBeNull();
    expect(template.content.querySelector('img')?.hasAttribute('src')).toBe(false);
    const style = template.content.querySelector('p')?.getAttribute('style') ?? '';
    expect(style).toContain('color: #000000');
    expect(style).toContain('line-height: 1.8');
    expect(style).not.toContain('background-image');
    expect(style).not.toContain('javascript');
  });
});

describe('hasEmbeddedDetailMedia', () => {
  it('detects media embedded in SmartEditor HTML', () => {
    expect(hasEmbeddedDetailMedia('<div><img src="/detail.jpg"></div>')).toBe(true);
    expect(hasEmbeddedDetailMedia('<div><iframe src="https://example.com"></iframe></div>')).toBe(
      true,
    );
    expect(hasEmbeddedDetailMedia('<p>텍스트만</p>')).toBe(false);
  });
});
