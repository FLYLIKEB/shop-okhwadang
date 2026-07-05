import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductTabs from '@/components/shared/products/ProductTabs';
import type { ProductDetailImage } from '@/lib/api';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/ko/products/1',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, number>) => {
    if (key === 'tabs.detailsImageAlt') return `상세 이미지 ${params?.index ?? ''}`;
    return key;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/lib/api', () => ({
  inquiriesApi: {
    getList: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/components/shared/reviews/ReviewsTab', () => ({
  default: () => <div>reviews-tab</div>,
}));

const separateDetailImages: ProductDetailImage[] = [
  {
    id: 1,
    url: '/separate-detail.jpg',
    alt: 'separate detail image',
    sortOrder: 0,
    isActive: true,
  },
];

describe('ProductTabs SmartEditor detail HTML', () => {
  it('renders SmartStore SmartEditor HTML with alignment, font classes, images, and embedded video preserved', async () => {
    render(
      <ProductTabs
        description={`
          <div class="se-viewer se-theme-default" lang="ko-KR">
            <div class="se-main-container">
              <div class="se-component se-horizontalLine"><hr class="se-hr"></div>
              <p class="se-text-paragraph se-text-paragraph-align-center" style="line-height:1.8; color:#823f00" id="SE-text">
                <span class="se-fs-fs19 se-ff-system" style="color:#823f00"><b>연자호</b></span>
              </p>
              <div class="se-component se-image">
                <img src="https://shop-phinf.pstatic.net/example.jpg" alt="detail" class="se-image-resource">
              </div>
              <iframe src="https://www.youtube.com/embed/example" title="video"></iframe>
              <script>window.bad=true</script>
            </div>
          </div>
        `}
        descriptionImages={separateDetailImages}
        productId={1}
      />,
    );

    await screen.findByText('연자호');

    expect(document.querySelector('.product-detail-html')).toBeTruthy();
    const paragraph = document.querySelector('.se-text-paragraph-align-center');
    expect(paragraph).toBeTruthy();
    expect(paragraph?.getAttribute('style')).toContain('line-height: 1.8');
    expect(paragraph?.getAttribute('style')).toContain('color: #823f00');
    expect(document.querySelector('.se-fs-fs19')).toBeTruthy();
    expect(document.querySelector('.se-hr')).toBeTruthy();
    expect(document.querySelector('.se-image-resource')?.getAttribute('src')).toBe(
      'https://shop-phinf.pstatic.net/example.jpg',
    );
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/example',
    );
    expect(document.querySelector('iframe')?.getAttribute('loading')).toBe('lazy');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByAltText('separate detail image')).not.toBeInTheDocument();
  });

  it('falls back to separate detail images when description has no embedded media', async () => {
    render(
      <ProductTabs
        description="<p>텍스트 설명</p>"
        descriptionImages={separateDetailImages}
        productId={1}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('텍스트 설명')).toBeInTheDocument();
    });
    expect(screen.getByAltText('separate detail image')).toBeInTheDocument();
    expect(screen.getByAltText('separate detail image').closest('.relative')).toHaveClass('max-w-4xl');
    expect(screen.getByAltText('separate detail image').closest('.flex')).toHaveClass('items-center');
  });
});
