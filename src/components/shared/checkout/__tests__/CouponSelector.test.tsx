import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CouponSelector from '@/components/shared/checkout/CouponSelector';
import type { CouponItem } from '@/lib/api';

const { getListMock } = vi.hoisted(() => ({
  getListMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  couponsApi: {
    getList: getListMock,
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

describe('CouponSelector', () => {
  beforeEach(() => {
    getListMock.mockReset();
  });

  it('마운트 시 쿠폰 목록 fetch 후 select 옵션 렌더', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    render(<CouponSelector onSelectionChange={vi.fn()} />);

    await waitFor(() => {
      expect(getListMock).toHaveBeenCalledWith('available');
    });
    expect(await screen.findByRole('option', { name: /신규가입 할인/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /5천원 정액 할인/ })).toBeInTheDocument();
  });

  it('쿠폰 선택 시 선택 값만 부모로 전달한다', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 0, willExpireSoon: 0 } });
    const onSelectionChange = vi.fn();
    render(<CouponSelector onSelectionChange={onSelectionChange} />);

    await screen.findByRole('option', { name: /신규가입 할인/ });
    await userEvent.selectOptions(screen.getByLabelText('쿠폰 선택'), '1');

    expect(onSelectionChange).toHaveBeenLastCalledWith(1, 0);
  });

  it('적립금 적용 시 잔액으로 상한 처리한 입력 값만 부모로 전달한다', async () => {
    getListMock.mockResolvedValue({ coupons: sampleCoupons, points: { balance: 1500, willExpireSoon: 0 } });
    const onSelectionChange = vi.fn();
    render(<CouponSelector onSelectionChange={onSelectionChange} />);

    await screen.findByLabelText('적립금 사용');
    await userEvent.type(screen.getByLabelText('적립금 사용'), '9999');
    await userEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onSelectionChange).toHaveBeenLastCalledWith(undefined, 1500);
    expect(screen.getByLabelText('적립금 사용')).toHaveValue(1500);
  });

  it('쿠폰 목록이 비어있으면 안내 문구 표시', async () => {
    getListMock.mockResolvedValue({ coupons: [], points: { balance: 0, willExpireSoon: 0 } });
    render(<CouponSelector onSelectionChange={vi.fn()} />);

    expect(await screen.findByText('사용 가능한 쿠폰이 없습니다.')).toBeInTheDocument();
  });
});
