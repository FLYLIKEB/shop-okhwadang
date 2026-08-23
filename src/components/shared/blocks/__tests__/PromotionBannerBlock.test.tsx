import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PromotionBannerBlock from '@/components/shared/blocks/PromotionBannerBlock';
import type { PromotionBannerContent } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      limitedTime: 'Limited time',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      eventEnded: 'Event ended',
      specialOffer: 'Special offer',
    }[key] ?? key),
}));

vi.mock('@/components/shared/hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: { current: null }, visible: true }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <span aria-label={alt} data-src={src} />,
}));

const timerContent: PromotionBannerContent = {
  title: 'Timer promotion',
  template: 'timer',
  end_date: '2030-01-02T03:04:05.000Z',
};

describe('PromotionBannerBlock hydration safety', () => {
  it('renders stable timer text on the server regardless of current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const firstRender = renderToString(<PromotionBannerBlock content={timerContent} />);

    vi.setSystemTime(new Date('2026-01-01T00:00:05.000Z'));
    const secondRender = renderToString(<PromotionBannerBlock content={timerContent} />);

    vi.useRealTimers();

    expect(secondRender).toBe(firstRender);
  });
});


describe('PromotionBannerBlock image derivatives', () => {
  it('uses the card derivative for card banners', () => {
    const html = renderToString(
      <PromotionBannerBlock
        content={{
          title: 'Card promotion',
          template: 'card',
          image_url: 'https://cdn.example.com/original.jpg',
          image_derivatives: { card: 'https://cdn.example.com/card.webp', full: 'https://cdn.example.com/full.webp' },
        }}
      />,
    );

    expect(html).toContain('data-src="https://cdn.example.com/card.webp"');
  });
});
