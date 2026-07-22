import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderCompletePage from '@/app/[locale]/order/complete/page';
import { ApiHttpError } from '@/lib/api-error';
import { SESSION_KEYS } from '@/constants/storage';
import { guestOrdersApi, ordersApi } from '@/lib/api';
import { toast } from 'sonner';
import koMessages from '@/i18n/messages/ko.json';

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };
let mockSearchParams = new URLSearchParams('orderId=1&orderNumber=ORD-20260325-ABCDE');
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

const translationCache = new Map<string, (key: string, values?: Record<string, string | number>) => string>();

vi.mock('next-intl', () => ({
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }),
  useTranslations: (namespace: keyof typeof koMessages) => {
    if (!translationCache.has(namespace)) {
      translationCache.set(namespace, (key: string, values?: Record<string, string | number>) => {
        const messages = koMessages[namespace] as Record<string, string>;
        let message = messages[key] ?? key;
        Object.entries(values ?? {}).forEach(([name, value]) => {
          message = message.replaceAll(`{${name}}`, String(value));
        });
        return message;
      });
    }
    return translationCache.get(namespace)!;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/api', () => ({
  ordersApi: { create: vi.fn(), getById: vi.fn() },
  guestOrdersApi: { create: vi.fn(), getById: vi.fn(), lookup: vi.fn() },
  paymentsApi: { prepare: vi.fn(), confirm: vi.fn() },
  cartApi: { getList: vi.fn() },
}));

const sampleOrder = {
  id: 1,
  orderNumber: 'ORD-20260325-ABCDE',
  status: 'paid',
  totalAmount: 40000,
  discountAmount: 0,
  shippingFee: 0,
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '12345',
  address: '서울시 강남구',
  addressDetail: null,
  memo: null,
  items: [
    {
      id: 1,
      productId: 10,
      productOptionId: null,
      productName: '테스트 상품',
      optionName: null,
      price: 20000,
      quantity: 2,
    },
  ],
  createdAt: '2026-03-25T10:00:00.000Z',
};

describe('OrderCompletePage guest proof coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams('orderId=1&orderNumber=ORD-20260325-ABCDE');
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, token: 'token', user: null });
  });

  it('redirects to locale home when no orderId in searchParams', async () => {
    mockSearchParams = new URLSearchParams('');
    await act(async () => {
      render(<OrderCompletePage params={Promise.resolve({ locale: 'ko' })} />);
    });
    expect(mockReplace).toHaveBeenCalledWith('/ko/');
  });

  it('loads guest order only when strong guest proof matches query params', async () => {
    sessionStorage.setItem(
      SESSION_KEYS.GUEST_ORDER_CONTEXT,
      JSON.stringify({
        orderId: 1,
        orderNumber: 'ORD-20260325-ABCDE',
        guestAccessToken: 'guest-token',
        guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
      }),
    );
    vi.mocked(guestOrdersApi.getById).mockResolvedValue(sampleOrder);

    await act(async () => {
      render(<OrderCompletePage params={Promise.resolve({ locale: 'ko' })} />);
    });

    await waitFor(() => {
      expect(guestOrdersApi.getById).toHaveBeenCalledWith(1, 'guest-token', 'ko');
    });

    expect(ordersApi.getById).not.toHaveBeenCalled();
    expect(await screen.findByText('테스트 상품')).toBeInTheDocument();
    expect(screen.getByText('주문번호와 이메일을 보관하면 비회원 주문을 다시 조회할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '비회원 주문조회' })).toHaveAttribute('href', '/ko/order/lookup');
  });

  it('treats stale guest context as invalid proof and falls back to member login recovery', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, token: null, user: null });
    sessionStorage.setItem(
      SESSION_KEYS.GUEST_ORDER_CONTEXT,
      JSON.stringify({
        orderId: 999,
        orderNumber: 'OTHER-ORDER',
        guestAccessToken: 'guest-token',
        guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
      }),
    );

    await act(async () => {
      render(<OrderCompletePage params={Promise.resolve({ locale: 'ko' })} />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/login?redirect=%2Fko%2Forder%2Fcomplete%3ForderId%3D1%26orderNumber%3DORD-20260325-ABCDE');
    });
    expect(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT)).toBeNull();
    expect(guestOrdersApi.getById).not.toHaveBeenCalled();
  });

  it('clears guest proof and redirects to lookup when guest access has expired', async () => {
    sessionStorage.setItem(
      SESSION_KEYS.GUEST_ORDER_CONTEXT,
      JSON.stringify({
        orderId: 1,
        orderNumber: 'ORD-20260325-ABCDE',
        guestAccessToken: 'guest-token',
        guestAccessTokenExpiresAt: '2026-08-22T00:00:00.000Z',
      }),
    );
    vi.mocked(guestOrdersApi.getById).mockRejectedValue(new ApiHttpError('Unauthorized', 401));

    await act(async () => {
      render(<OrderCompletePage params={Promise.resolve({ locale: 'ko' })} />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/lookup');
    });
    expect(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT)).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('비회원 주문 조회 권한이 만료되었습니다. 주문조회에서 다시 확인해 주세요.');
  });

  it('keeps member mode when no guest proof exists and user is authenticated', async () => {
    vi.mocked(ordersApi.getById).mockResolvedValue(sampleOrder);

    await act(async () => {
      render(<OrderCompletePage params={Promise.resolve({ locale: 'ko' })} />);
    });

    await waitFor(() => {
      expect(ordersApi.getById).toHaveBeenCalledWith(1);
    });
    expect(screen.getByRole('link', { name: '주문 내역 보기' })).toHaveAttribute('href', '/ko/my/orders');
    expect(screen.getByRole('link', { name: '쇼핑 계속하기' })).toHaveAttribute('href', '/ko/');
  });
});
