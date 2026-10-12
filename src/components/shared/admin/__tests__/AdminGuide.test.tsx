import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminGuide } from '@/components/shared/admin/AdminGuide';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('@/lib/admin-guide', () => ({
  ADMIN_GUIDE_GROUPS: ['start', 'operations', 'settings'] as const,
  ADMIN_GUIDE_TOPICS: [
    { id: 'dashboard', group: 'start', href: '/admin/dashboard' },
    { id: 'orders', group: 'operations', href: '/admin/orders' },
    { id: 'logs', group: 'settings', href: '/admin/logs', superAdminOnly: true },
  ] as const,
  ADMIN_GUIDE_SCREENSHOTS: {
    dashboard: {
      first: '/images/admin-guide/dashboard.webp',
      second: '/images/admin-guide/dashboard.webp',
      third: '/images/admin-guide/dashboard.webp',
    },
    orders: {
      first: '/images/admin-guide/orders.webp',
      second: '/images/admin-guide/orders.webp',
      third: '/images/admin-guide/orders.webp',
    },
    logs: {
      first: '/images/admin-guide/logs.webp',
      second: '/images/admin-guide/logs.webp',
      third: '/images/admin-guide/logs.webp',
    },
  },
}));

const messages = {
  admin: {
    guide: {
      title: '관리자 가이드',
      description: '필요한 일을 빠르게 찾습니다.',
      searchLabel: '가이드 검색',
      searchPlaceholder: '업무나 화면 이름 검색',
      noResults: '검색 결과가 없습니다.',
      clearSearch: '검색 지우기',
      contextTitle: '이 화면 사용법',
      allGuides: '전체 가이드',
      openScreen: '화면 열기',
      stepsTitle: '기본 순서',
      cautionTitle: '주의할 점',
      previousSlide: '이전 설명',
      nextSlide: '다음 설명',
      slideStatus: '{total}개 설명 중 {current}번째',
      viewScreenshot: '화면 크게 보기',
      screenshotAlt: '{title} 관리 화면 예시',
      sampleScreenshot: '예시 데이터로 촬영한 화면입니다.',
      groups: {
        start: '시작',
        operations: '운영',
        settings: '설정',
      },
      topics: {
        dashboard: {
          title: '대시보드',
          summary: '지표를 한눈에 봅니다.',
          steps: {
            first: '기간을 선택합니다.',
            second: '매출과 주문을 봅니다.',
            third: '필요한 화면으로 이동합니다.',
          },
          caution: '집계가 늦을 수 있습니다.',
        },
        orders: {
          title: '주문 관리',
          summary: '결제와 배송 흐름을 처리합니다.',
          steps: {
            first: '결제완료 주문을 엽니다.',
            second: '환불 요청을 먼저 확인합니다.',
            third: '배송 정보를 저장합니다.',
          },
          caution: '발송 전 주소를 확인하세요.',
        },
        logs: {
          title: '원격 로그',
          summary: '운영 로그를 확인합니다.',
          steps: {
            first: '범위를 좁힙니다.',
            second: '오류를 확인합니다.',
            third: '조치 내용을 기록합니다.',
          },
          caution: '최고관리자만 접근합니다.',
        },
      },
    },
  },
};

function renderGuide(role = 'admin') {
  mockUseAuth.mockReturnValue({
    user: { id: 1, name: '관리자', email: 'admin@test.com', role },
  });

  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AdminGuide />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/admin/guide');
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AdminGuide', () => {
  it('searches across translated topic text and opens matches', () => {
    renderGuide();

    fireEvent.change(screen.getByLabelText('가이드 검색'), { target: { value: '환불' } });

    expect(screen.getByText('주문 관리')).toBeInTheDocument();
    expect(screen.getByText('환불 요청을 먼저 확인합니다.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3개 설명 중 2번째');
    expect(screen.queryByText('결제완료 주문을 엽니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('대시보드')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음 설명' }));
    expect(screen.getByText('배송 정보를 저장합니다.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('가이드 검색'), { target: { value: '요청' } });
    expect(screen.getByText('환불 요청을 먼저 확인합니다.')).toBeInTheDocument();
  });

  it('moves through guide slides with bounded previous and next buttons', () => {
    renderGuide();

    fireEvent.click(screen.getByText('대시보드'));

    expect(screen.getByText('기간을 선택합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 설명' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '다음 설명' }));
    expect(screen.getByText('매출과 주문을 봅니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음 설명' }));
    expect(screen.getByText('필요한 화면으로 이동합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 설명' })).toBeDisabled();
  });

  it('moves guide slides with arrow keys when the slider has focus', () => {
    renderGuide();

    fireEvent.click(screen.getByText('대시보드'));
    const slider = screen.getByRole('group', { name: '대시보드' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('매출과 주문을 봅니다.')).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(screen.getByText('기간을 선택합니다.')).toBeInTheDocument();
  });

  it('filters super admin topics by current role', () => {
    renderGuide();
    expect(screen.queryByText('원격 로그')).not.toBeInTheDocument();

    renderGuide('super_admin');
    expect(screen.getByText('원격 로그')).toBeInTheDocument();
  });

  it('opens and scrolls to the topic from the hash', async () => {
    window.history.replaceState(null, '', '/admin/guide#orders');
    renderGuide();

    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    expect(document.getElementById('orders')).toHaveAttribute('open');
  });
});
