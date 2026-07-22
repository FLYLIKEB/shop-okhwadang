import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminOrdersTable } from '../AdminOrdersTable';
import type { AdminOrder } from '@/lib/api';

vi.mock('../OrderStatusSelect', () => ({
  OrderStatusSelect: ({ orderId }: { orderId: number }) => <div data-testid={`status-select-${orderId}`} />,
}));

vi.mock('@/utils/localMessages', () => ({
  localMessage: (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      'admin.orders.noOrders': '주문이 없습니다.',
      'admin.orders.columns.orderNumber': '주문번호',
      'admin.orders.columns.orderer': '주문자',
      'admin.orders.columns.product': '상품',
      'admin.orders.columns.amount': '금액',
      'admin.orders.columns.status': '상태',
      'admin.orders.columns.orderDate': '주문일',
      'admin.orders.columns.action': '액션',
      'admin.orders.status.paid': '결제완료',
      'admin.orders.status.preparing': '상품준비중',
      'admin.orders.trackingSlip': '운송장',
      'admin.orders.cancel.action': '주문 취소',
      'admin.orders.productSummary.more': `${values?.productName} 외 ${values?.count}건`,
    };
    return messages[key] ?? key;
  },
}));

const memberOrder: AdminOrder = {
  id: 1,
  orderNumber: 'ORD-001',
  status: 'paid',
  totalAmount: 40000,
  recipientName: '회원 주문자',
  recipientPhone: '010-1111-2222',
  address: '서울시',
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
  customerType: 'member',
  guestEmailNormalized: null,
  user: { id: 1, email: 'member@example.com', name: '회원' },
  items: [{ id: 1, productName: '회원 상품', optionName: null, price: 40000, quantity: 1 }],
};

const guestOrder: AdminOrder = {
  id: 2,
  orderNumber: 'ORD-002',
  status: 'preparing',
  totalAmount: 52000,
  recipientName: '비회원 주문자',
  recipientPhone: '010-2222-3333',
  address: '부산시',
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
  customerType: 'guest',
  guestEmailNormalized: 'guest@example.com',
  user: null,
  items: [
    { id: 2, productName: '비회원 상품', optionName: null, price: 26000, quantity: 1 },
    { id: 3, productName: '추가 상품', optionName: null, price: 26000, quantity: 1 },
  ],
};

describe('AdminOrdersTable guest display', () => {
  it('renders member email for member rows and guest email for guest rows', () => {
    render(
      <AdminOrdersTable
        orders={[memberOrder, guestOrder]}
        onStatusChange={vi.fn()}
        onShippingRegister={vi.fn()}
        onCancelOrder={vi.fn()}
      />,
    );

    expect(screen.getAllByText('member@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('guest@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('비회원 상품 외 1건').length).toBeGreaterThan(0);
  });
});
