import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeroBannerBlock from '../HeroBannerBlock';

vi.mock('embla-carousel-react', () => ({
  default: vi.fn(() => [
    { current: null },
    { scrollPrev: vi.fn(), scrollNext: vi.fn(), scrollTo: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: vi.fn(() => 0) },
  ]),
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const dict: Record<string, Record<string, unknown>> = {
      'home.hero': {
        bannerLabel: '메인 배너',
        primaryLabel: '옥화당 茶室',
        prevSlide: '이전 슬라이드',
        nextSlide: '다음 슬라이드',
        goToSlide: '{index}번 슬라이드로 이동',
      },
      'home.heroDefaultSlides': {
        '0.title': '의흥 장인의 손끝에서',
        '0.subtitle': '600년 전통',
        '0.ctaText': '컬렉션 보기',
        '1.title': '보이차의 깊은 여운',
        '1.subtitle': '세월이 빚어낸 맛',
        '1.ctaText': '아카이브 보기',
        '2.title': '찻자리의 완성',
        '2.subtitle': '고요한 시간의 시작',
        '2.ctaText': '저널 보기',
      },
    };
    const bucket = dict[namespace ?? ''] ?? {};
    return (key: string, params?: Record<string, unknown>) => {
      const value = bucket[key];
      if (typeof value === 'string' && params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
          value,
        );
      }
      return (value as string) ?? key;
    };
  },
}));

const DEFAULT_SLIDES = [
  {
    title: '의흥 장인의 손끝에서',
    subtitle: '600년 전통, 정성으로 빚은 자사호를 만나보세요',
    cta_text: '컬렉션 보기',
    cta_url: '/collection',
    bg_color: '#1B3A4B',
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1920&q=80',
  },
  {
    title: '보이차의 깊은 여운',
    subtitle: '세월이 빚어낸 맛, 엄선된 보이차 컬렉션',
    cta_text: '아카이브 보기',
    cta_url: '/archive',
    bg_color: '#4A6741',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1920&q=80',
  },
];

describe('HeroBannerBlock', () => {
  describe('template=slider', () => {
    it('여러 슬라이드가 렌더링됨', () => {
      render(
        <HeroBannerBlock
          content={{
            title: '테스트',
            subtitle: '테스트 부제목',
            image_url: '',
            template: 'slider',
            slides: DEFAULT_SLIDES,
          }}
        />
      );

      expect(screen.getByText('의흥 장인의 손끝에서')).toBeInTheDocument();
      expect(screen.getByText('보이차의 깊은 여운')).toBeInTheDocument();
    });

    it('좌우 화살표 버튼이 렌더링됨', () => {
      render(
        <HeroBannerBlock
          content={{
            title: '테스트',
            image_url: '',
            template: 'slider',
            slides: DEFAULT_SLIDES,
          }}
        />
      );

      expect(screen.getByLabelText('이전 슬라이드')).toBeInTheDocument();
      expect(screen.getByLabelText('다음 슬라이드')).toBeInTheDocument();
    });

    it('슬라이드 인디케이터가 렌더링됨', () => {
      render(
        <HeroBannerBlock
          content={{
            title: '테스트',
            image_url: '',
            template: 'slider',
            slides: DEFAULT_SLIDES,
          }}
        />
      );

      expect(screen.getByLabelText('1번 슬라이드로 이동')).toBeInTheDocument();
      expect(screen.getByLabelText('2번 슬라이드로 이동')).toBeInTheDocument();
    });

    it('슬라이드가 비어 있으면 아무것도 렌더하지 않음 (DB 필수 정책)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = render(
        <HeroBannerBlock
          content={{
            title: '테스트',
            image_url: '',
            template: 'slider',
            slides: [],
          }}
        />
      );

      expect(container).toBeEmptyDOMElement();
      warnSpy.mockRestore();
    });
  });

  describe('template=fullscreen', () => {
    it('단일 히어로 배너 렌더링', () => {
      render(
        <HeroBannerBlock
          content={{
            title: '풀스크린 히어로',
            subtitle: '부제목입니다',
            image_url: 'https://example.com/image.jpg',
            cta_text: '버튼',
            cta_url: '/page',
            template: 'fullscreen',
          }}
        />
      );

      expect(screen.getByText('풀스크린 히어로')).toBeInTheDocument();
      expect(screen.getByText('부제목입니다')).toBeInTheDocument();
      expect(screen.getByText('버튼')).toBeInTheDocument();
    });
  });

  describe('template=split', () => {
    it('분할 레이아웃 렌더링', () => {
      render(
        <HeroBannerBlock
          content={{
            title: '분할 히어로',
            subtitle: '분할 부제목',
            image_url: 'https://example.com/image.jpg',
            cta_text: '분할 버튼',
            cta_url: '/page',
            template: 'split',
          }}
        />
      );

      expect(screen.getByText('분할 히어로')).toBeInTheDocument();
      expect(screen.getByText('분할 버튼')).toBeInTheDocument();
    });
  });
});
