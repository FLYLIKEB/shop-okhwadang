import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderLookupPage from '@/app/[locale]/order/lookup/page';
import { guestOrdersApi } from '@/lib/api';
import { ApiHttpError } from '@/lib/api-error';
import { SESSION_KEYS } from '@/constants/storage';
import { toast } from 'sonner';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      eyebrow: '비회원 고객 지원',
      title: '비회원 주문조회',
      description: '결제에 사용한 주문번호와 이메일을 입력하면 비회원 주문을 확인할 수 있습니다.',
      orderNumberLabel: '주문번호',
      orderNumberPlaceholder: 'ORD-000001',
      emailLabel: '이메일',
      emailPlaceholder: 'you@example.com',
      submit: '주문조회',
      submitting: '조회 중...',
      guestLookupSuccess: '비회원 주문을 찾았습니다.',
      guestLookupNotFound: '주문번호와 이메일이 일치하는 비회원 주문을 찾을 수 없습니다.',
      guestLookupValidationError: '주문번호와 이메일을 다시 확인해 주세요.',
      guestLookupError: '지금은 비회원 주문을 조회할 수 없습니다.',
      memberHintTitle: '회원 주문 내역이 필요하신가요?',
      memberHintDescription: '로그인하면 마이페이지에서 회원 주문, 결제 상태, 배송 현황을 확인할 수 있습니다.',
      memberHintAction: '로그인으로 이동',
    };
    return messages[key] ?? key;
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  guestOrdersApi: { lookup: vi.fn(), create: vi.fn(), getById: vi.fn() },
}));

describe('OrderLookupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('rewrites guest context and redirects to order complete after successful lookup', async () => {
    vi.mocked(guestOrdersApi.lookup).mockResolvedValue({
      order: {
        id: 7,
        orderNumber: 'GUEST-7001',
      },
      guestAccessToken: 'rotated-guest-token',
      guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
    } as Awaited<ReturnType<typeof guestOrdersApi.lookup>>);

    const user = userEvent.setup();
    render(<OrderLookupPage />);

    await user.type(screen.getByLabelText('주문번호'), ' GUEST-7001 ');
    await user.type(screen.getByLabelText('이메일'), ' guest@example.com ');
    await user.click(screen.getByRole('button', { name: '주문조회' }));

    await waitFor(() => {
      expect(guestOrdersApi.lookup).toHaveBeenCalledWith({
        orderNumber: 'GUEST-7001',
        email: 'guest@example.com',
        locale: 'ko',
      });
    });

    expect(JSON.parse(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT) ?? '{}')).toEqual({
      orderId: 7,
      orderNumber: 'GUEST-7001',
      guestAccessToken: 'rotated-guest-token',
      guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
    });
    expect(toast.success).toHaveBeenCalledWith('비회원 주문을 찾았습니다.');
    expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=7&orderNumber=GUEST-7001&flow=guest');
  });

  it('shows not-found guest toast on 404 lookup failure', async () => {
    vi.mocked(guestOrdersApi.lookup).mockRejectedValue(new ApiHttpError('Not found', 404));

    const user = userEvent.setup();
    render(<OrderLookupPage />);

    await user.type(screen.getByLabelText('주문번호'), 'GUEST-404');
    await user.type(screen.getByLabelText('이메일'), 'guest@example.com');
    await user.click(screen.getByRole('button', { name: '주문조회' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('주문번호와 이메일이 일치하는 비회원 주문을 찾을 수 없습니다.');
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
