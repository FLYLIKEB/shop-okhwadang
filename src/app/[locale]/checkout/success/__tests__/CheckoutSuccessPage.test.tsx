import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutSuccessPage from '@/app/[locale]/checkout/success/page';
import { toast } from 'sonner';

// ---- next/navigation ----
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

// ---- sonner ----
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// ---- CartContext ----
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
  CartContext: {},
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- api ----
const mockConfirm = vi.fn();
vi.mock('@/lib/api', () => ({
  paymentsApi: { confirm: (...args: unknown[]) => mockConfirm(...args) },
}));

// ---- error utility ----
vi.mock('@/utils/error', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleApiError: vi.fn((_err: unknown) => '결제 확인 중 오류가 발생했습니다.'),
}));

const makeParams = () => Promise.resolve({ locale: 'ko' as const });

describe('CheckoutSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams();
  });

  const validPaymentContext = {
    orderId: 1,
    orderNumber: 'ORD-001',
    amount: 40000,
  };

  const setupValidSearchParams = () => {
    mockSearchParams.set('paymentKey', 'pay_abc123');
    mockSearchParams.set('orderId', 'ORD-001');
    mockSearchParams.set('amount', '40000');
  };

  describe('보안: 결제 금액 처리', () => {
    it('URL의 amount가 sessionStorage의 ctx.amount와 다르면 결제 확인을 하지 않고 cart로 리다이렉션한다', async () => {
      mockSearchParams.set('paymentKey', 'pay_abc123');
      mockSearchParams.set('orderId', 'ORD-001');
      mockSearchParams.set('amount', '1000');

      sessionStorage.setItem('tossPaymentContext', JSON.stringify(validPaymentContext));

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ko/cart');
      });
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('결제 금액이 일치하지 않습니다.');
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('URL과 sessionStorage의 금액이 일치하면 ctx.amount로 결제 확인을 진행한다', async () => {
      mockSearchParams.set('paymentKey', 'pay_abc123');
      mockSearchParams.set('orderId', 'ORD-001');
      mockSearchParams.set('amount', '40000');

      const ctxAmount = 40000;
      sessionStorage.setItem('tossPaymentContext', JSON.stringify({
        ...validPaymentContext,
        amount: ctxAmount,
      }));

      mockConfirm.mockResolvedValue({
        paymentId: 1,
        orderId: 1,
        orderNumber: 'ORD-001',
        status: 'paid',
        method: 'card',
        amount: ctxAmount,
        paidAt: new Date().toISOString(),
      });

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith({
          orderId: 1,
          paymentKey: 'pay_abc123',
          amount: ctxAmount,
        });
      });
    });
  });

  describe('필수 파라미터 검증', () => {
    it('paymentKey가 없으면 cart로 리다이렉션한다', async () => {
      mockSearchParams.set('orderId', 'ORD-001');
      mockSearchParams.set('amount', '40000');
      // paymentKey 없음

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ko/cart');
      });
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('결제 정보가 올바르지 않습니다.');
    });

    it('tossPaymentContext가 sessionStorage에 없으면 cart로 리다이렉션한다', async () => {
      setupValidSearchParams();
      // sessionStorage에 tossPaymentContext 없음

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ko/cart');
      });
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('결제 컨텍스트를 찾을 수 없습니다.');
    });
  });

  describe('결제 완료 후 동작', () => {
    it('결제 확인 성공 시 sessionStorageアイテムをクリア하고 order/complete页面로リ다이렉션한다', async () => {
      setupValidSearchParams();
      sessionStorage.setItem('tossPaymentContext', JSON.stringify(validPaymentContext));
      sessionStorage.setItem('checkoutItems', JSON.stringify([{ id: 1 }]));

      mockConfirm.mockResolvedValue({
        paymentId: 1,
        orderId: 1,
        orderNumber: 'ORD-001',
        status: 'paid',
        method: 'card',
        amount: 40000,
        paidAt: new Date().toISOString(),
      });

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=1&orderNumber=ORD-001');
      });
      expect(sessionStorage.getItem('tossPaymentContext')).toBeNull();
      expect(sessionStorage.getItem('checkoutItems')).toBeNull();
    });

    it('결제 확인 실패 시エラーメッセージを表示して재시도 버튼을 표시한다', async () => {
      setupValidSearchParams();
      sessionStorage.setItem('tossPaymentContext', JSON.stringify(validPaymentContext));

      mockConfirm.mockRejectedValue(new Error('Payment failed'));

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled();
      });
      expect(screen.getByText('결제 확인 실패')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '장바구니로 돌아가기' })).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('결제 처리 중에는 로딩 메시지를 표시한다', async () => {
      setupValidSearchParams();
      sessionStorage.setItem('tossPaymentContext', JSON.stringify(validPaymentContext));

      // 결제가 끝나지 않도록 mock을 설정하지 않음
      mockConfirm.mockImplementation(
        () => new Promise(() => {}) //，永远に解决しない
      );

      await act(async () => {
        render(<CheckoutSuccessPage params={makeParams()} />);
      });

      expect(screen.getByText('결제 처리 중...')).toBeInTheDocument();
    });
  });
});