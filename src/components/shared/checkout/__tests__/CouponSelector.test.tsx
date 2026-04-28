import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CouponSelector from '@/components/shared/checkout/CouponSelector';
import type { CouponItem, CalculateDiscountResponse } from '@/lib/api';

const { getListMock, calculateMock, toastErrorMock } = vi.hoisted(() => ({
  getListMock: vi.fn(),
  calculateMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  couponsApi: {
    getList: getListMock,
    calculate: calculateMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const sampleCoupons: CouponItem[] = [
  {
    id: 1,
    couponId: 100,
    code: 'WELCOME',
    name: '신규가입 할인',
    type: 'percentage',
    value: 10,
    minOrderAmount: 30000,
    maxDiscount: 5000,
    expiresAt: '2030-12-31T23:59:59.000Z',
    status: 'available',
    issuedAt: '2024-01-01T00:00:00.000Z',
    usedAt: null,
  },
  {
    id: 2,
    couponId: 101,
    code: 'FIXED5K',
    name: '5천원 정액 할인',
    type: 'fixed',
    value: 5000,
    minOrderAmount: 50000,
    maxDiscount: null,
    expiresAt: '2030-12-31T23:59:59.000Z',
    status: 'available',
    issuedAt: '2024-01-01T00:00:00.000Z',
    usedAt: null,
  },
];

const discountResult: CalculateDiscountResponse = {
  originalAmount: 100000,
  couponDiscount: 5000,
  pointsDiscount: 0,
  finalAmount: 95000,
  shippingFee: 0,
  totalPayable: 95000,
};

describe('CouponSelector', () => {
  beforeEach(() => {
    getListMock.mockReset();
    calculateMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('마운트 시 쿠폰 목록 fetch 후 select 옵션 렌더', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    render(<CouponSelector orderAmount={100000} onDiscountChange={vi.fn()} />);

    await waitFor(() => {
      expect(getListMock).toHaveBeenCalledWith('available');
    });
    expect(await screen.findByRole('option', { name: /신규가입 할인/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /5천원 정액 할인/ })).toBeInTheDocument();
  });

  it('쿠폰 선택 → calculate 호출 + onDiscountChange(result, id)', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    calculateMock.mockResolvedValue(discountResult);
    const onDiscountChange = vi.fn();
    render(<CouponSelector orderAmount={100000} onDiscountChange={onDiscountChange} />);

    await screen.findByRole('option', { name: /신규가입 할인/ });
    await userEvent.selectOptions(screen.getByLabelText('쿠폰 선택'), '1');

    await waitFor(() => {
      expect(calculateMock).toHaveBeenCalledWith({ orderAmount: 100000, userCouponId: 1 });
    });
    expect(onDiscountChange).toHaveBeenCalledWith(discountResult, 1);
  });

  it('빈 값 선택 → onDiscountChange(null, undefined)', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    calculateMock.mockResolvedValue(discountResult);
    const onDiscountChange = vi.fn();
    render(<CouponSelector orderAmount={100000} onDiscountChange={onDiscountChange} />);

    await screen.findByRole('option', { name: /신규가입 할인/ });
    const select = screen.getByLabelText('쿠폰 선택');
    // 먼저 쿠폰 선택 후 다시 빈 값으로
    await userEvent.selectOptions(select, '1');
    await waitFor(() => expect(calculateMock).toHaveBeenCalled());
    calculateMock.mockClear();
    onDiscountChange.mockClear();
    await userEvent.selectOptions(select, '');

    expect(onDiscountChange).toHaveBeenLastCalledWith(null, undefined);
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it('calculate 실패 → toast.error + onDiscountChange(null) + 선택 초기화', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    calculateMock.mockRejectedValue(new Error('최소 주문금액 미달'));
    const onDiscountChange = vi.fn();
    render(<CouponSelector orderAmount={100000} onDiscountChange={onDiscountChange} />);

    await screen.findByRole('option', { name: /신규가입 할인/ });
    await userEvent.selectOptions(screen.getByLabelText('쿠폰 선택'), '1');

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(onDiscountChange).toHaveBeenLastCalledWith(null, undefined);
  });

  it('쿠폰 목록이 비어있으면 안내 문구 표시', async () => {
    getListMock.mockResolvedValue({ coupons: [], points: { balance: 0, willExpireSoon: 0 } });
    render(<CouponSelector orderAmount={100000} onDiscountChange={vi.fn()} />);

    expect(await screen.findByText('사용 가능한 쿠폰이 없습니다.')).toBeInTheDocument();
  });

  it('빈 목록 + 선택 안 함 → onDiscountChange 호출 안 됨', async () => {
    getListMock.mockResolvedValue({ coupons: [], points: { balance: 0, willExpireSoon: 0 } });
    const onDiscountChange = vi.fn();
    render(<CouponSelector orderAmount={100000} onDiscountChange={onDiscountChange} />);

    await screen.findByText('사용 가능한 쿠폰이 없습니다.');
    expect(onDiscountChange).not.toHaveBeenCalled();
  });
});
