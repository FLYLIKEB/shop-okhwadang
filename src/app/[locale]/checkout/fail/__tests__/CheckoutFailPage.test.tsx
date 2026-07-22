import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutFailPage from '@/app/[locale]/checkout/fail/page';
import { SESSION_KEYS } from '@/constants/storage';
import { toast } from 'sonner';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const messages: Record<string, string> = {
      failedTitle: '결제 실패',
      back: '돌아가기',
      loading: '로딩 중...',
      defaultFailMessage: '결제에 실패했습니다.',
      errorCode: `오류 코드: ${values?.code ?? ''}`,
    };
    return messages[key] ?? key;
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('CheckoutFailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSearchParams = new URLSearchParams('code=PAY_FAIL&message=결제 실패');
  });

  it('clears hosted contexts but preserves checkout items and guest context', async () => {
    sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify({ orderId: 1 }));
    sessionStorage.setItem(SESSION_KEYS.PAYPAL_CONTEXT, JSON.stringify({ orderId: 1 }));
    sessionStorage.setItem(SESSION_KEYS.NAVERPAY_CONTEXT, JSON.stringify({ orderId: 1 }));
    sessionStorage.setItem(SESSION_KEYS.EXIMBAY_CONTEXT, JSON.stringify({ orderId: 1 }));
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([{ id: 1 }]));
    sessionStorage.setItem(SESSION_KEYS.GUEST_ORDER_CONTEXT, JSON.stringify({ orderId: 1, orderNumber: 'GUEST-001' }));

    await act(async () => {
      render(<CheckoutFailPage params={Promise.resolve({ locale: 'ko' as const })} />);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('결제 실패');
    });

    expect(sessionStorage.getItem(SESSION_KEYS.TOSS_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.PAYPAL_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.NAVERPAY_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.EXIMBAY_CONTEXT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEYS.CHECKOUT_ITEMS)).toBe(JSON.stringify([{ id: 1 }]));
    expect(sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT)).toBe(JSON.stringify({ orderId: 1, orderNumber: 'GUEST-001' }));
  });

  it('retries by routing back to locale checkout', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<CheckoutFailPage params={Promise.resolve({ locale: 'ko' as const })} />);
    });

    await user.click(screen.getByRole('button', { name: '돌아가기' }));
    expect(mockReplace).toHaveBeenCalledWith('/ko/checkout');
  });
});
