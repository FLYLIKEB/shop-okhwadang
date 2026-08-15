import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CheckoutSuccessPage from '@/app/[locale]/checkout/success/page';
import { toast } from 'sonner';
import { ApiHttpError } from '@/lib/api-error';
import { SESSION_KEYS } from '@/constants/storage';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockRefetch = vi.fn().mockResolvedValue(undefined);
const mockMemberConfirm = vi.fn();
const mockGuestConfirm = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ refetch: mockRefetch }),
}));

vi.mock('@/lib/api', () => ({
  paymentsApi: { confirm: (...args: unknown[]) => mockMemberConfirm(...args) },
  guestPaymentsApi: { confirm: (...args: unknown[]) => mockGuestConfirm(...args) },
}));

vi.mock('@/utils/error', () => ({
  handleApiError: vi.fn(() => '결제 확인 중 오류가 발생했습니다.'),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string, values?: Record<string, string>) => {
      const messages: Record<string, string> = {
        failedTitle: '결제 실패',
        confirmFailedTitle: '결제 확인 실패',
        confirmFailedDescription: '결제 확인 중 문제가 발생했습니다. 고객센터에 문의해주세요.',
        processingTitle: '결제 처리 중...',
        processingDescription: '잠시만 기다려주세요.',
        backToCart: '장바구니로 돌아가기',
        back: '돌아가기',
        loading: '로딩 중...',
        guestAccessExpired: '비회원 주문 조회 권한이 만료되었습니다. 주문조회에서 다시 확인해 주세요.',
        errorCode: `오류 코드: ${values?.code ?? ''}`,
        defaultFailMessage: '결제에 실패했습니다.',
      };
      return messages[key] ?? key;
    };
  },
}));

const makeParams = () => Promise.resolve({ locale: 'ko' as const });

const memberContext = {
  orderId: 1,
  orderNumber: 'ORD-001',
  amount: 40000,
};

const guestContext = {
  orderId: 2,
  orderNumber: 'GUEST-001',
  amount: 52000,
  guestAccessToken: 'guest-token-1',
  guestAccessTokenExpiresAt: '2026-08-21T00:00:00.000Z',
};

function setTossSearchParams(amount = '40000') {
  mockSearchParams = new URLSearchParams();
  mockSearchParams.set('paymentKey', 'pay_abc123');
  mockSearchParams.set('orderId', 'ORD-001');
  mockSearchParams.set('amount', amount);
}

describe('CheckoutSuccessPage guest coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it('persists rotated guest context and redirects to guest order complete after guest hosted confirm', async () => {
    mockSearchParams.set('token', 'PAYPAL-ORDER-1');
    sessionStorage.setItem(SESSION_KEYS.PAYPAL_CONTEXT, JSON.stringify(guestContext));
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([{ id: 1 }]));
    sessionStorage.setItem(SESSION_KEYS.GUEST_ORDER_CONTEXT, JSON.stringify({ stale: true }));

    mockGuestConfirm.mockResolvedValue({
      paymentId: 10,
      orderId: 2,
      orderNumber: 'GUEST-001',
      status: 'paid',
      method: 'paypal',
      amount: 52000,
      paidAt: '2026-07-22T00:00:00.000Z',
      guestAccessToken: 'guest-token-rotated',
      guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
    });

    await act(async () => {
      render(<CheckoutSuccessPage params={makeParams()} />);
    });

    await waitFor(() => {
      expect(mockGuestConfirm).toHaveBeenCalledWith(
        2,
        { paymentKey: 'PAYPAL-ORDER-1', amount: 52000 },
        'guest-token-1',
        { headers: { 'Idempotency-Key': expect.stringMatching(/^[A-Za-z0-9-]{36}$/) } },
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=2&orderNumber=GUEST-001&flow=guest');
    });

    expect(JSON.parse(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT) ?? '{}')).toEqual({
      orderId: 2,
      orderNumber: 'GUEST-001',
      guestAccessToken: 'guest-token-rotated',
      guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
    });
    expect(sessionStorage.getItem(SESSION_KEYS.PAYPAL_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.CHECKOUT_ITEMS)).toBeNull();
    expect(mockRefetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('결제가 완료되었습니다.');
  });

  it('clears guest state and redirects to lookup when guest confirm returns 401', async () => {
    setTossSearchParams('52000');
    sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify(guestContext));
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([{ id: 1 }]));
    sessionStorage.setItem(SESSION_KEYS.GUEST_ORDER_CONTEXT, JSON.stringify(guestContext));

    mockGuestConfirm.mockRejectedValue(new ApiHttpError('Unauthorized', 401));

    await act(async () => {
      render(<CheckoutSuccessPage params={makeParams()} />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/lookup');
    });

    expect(sessionStorage.getItem(SESSION_KEYS.TOSS_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.CHECKOUT_ITEMS)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT)).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('비회원 주문 조회 권한이 만료되었습니다. 주문조회에서 다시 확인해 주세요.');
  });

  it('persists one opaque hosted confirmation key across a retry', async () => {
    setTossSearchParams();
    sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify(memberContext));
    mockMemberConfirm.mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce({
      paymentId: 1, orderId: 1, orderNumber: 'ORD-001', status: 'paid', method: 'card', amount: 40000, paidAt: '2026-07-22T00:00:00.000Z',
    });
    let first!: ReturnType<typeof render>;
    await act(async () => {
      first = render(<CheckoutSuccessPage params={makeParams()} />);
    });
    await waitFor(() => expect(mockMemberConfirm).toHaveBeenCalledTimes(1));
    const firstKey = mockMemberConfirm.mock.calls[0][1].headers['Idempotency-Key'];
    first.unmount();
    await act(async () => {
      render(<CheckoutSuccessPage params={makeParams()} />);
    });
    await waitFor(() => expect(mockMemberConfirm).toHaveBeenCalledTimes(2));
    expect(mockMemberConfirm.mock.calls[1][1].headers['Idempotency-Key']).toBe(firstKey);
  });

  it('keeps member hosted confirm behavior for non-guest contexts', async () => {
    setTossSearchParams();
    sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify(memberContext));
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([{ id: 1 }]));

    mockMemberConfirm.mockResolvedValue({
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORD-001',
      status: 'paid',
      method: 'card',
      amount: 40000,
      paidAt: '2026-07-22T00:00:00.000Z',
    });

    await act(async () => {
      render(<CheckoutSuccessPage params={makeParams()} />);
    });

    await waitFor(() => {
      expect(mockMemberConfirm).toHaveBeenCalledWith(
        { orderId: 1, paymentKey: 'pay_abc123', amount: 40000 },
        { headers: { 'Idempotency-Key': expect.stringMatching(/^[A-Za-z0-9-]{36}$/) } },
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=1&orderNumber=ORD-001');
    });
    expect(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT)).toBeNull();
  });

  it('shows failure UI when confirm fails with a non-guest error', async () => {
    setTossSearchParams();
    sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify(memberContext));

    mockMemberConfirm.mockRejectedValue(new Error('Payment failed'));

    await act(async () => {
      render(<CheckoutSuccessPage params={makeParams()} />);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(screen.getByText('결제 확인 실패')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '장바구니로 돌아가기' })).toBeInTheDocument();
  });
});
