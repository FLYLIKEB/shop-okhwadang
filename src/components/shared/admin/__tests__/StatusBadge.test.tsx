import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusBadge, ProductStatusBadge, InquiryStatusBadge, JournalStatusBadge, StatusBadge } from '../StatusBadge';

vi.mock('@/utils/localMessages', () => ({
  localMessage: (key: string) => {
    const messages: Record<string, string> = {
      'statusBadge.active.active': '활성',
      'statusBadge.active.inactive': '비활성',
      'admin.orders.status.paid': '결제완료',
      'admin.products.status.soldout': '품절',
      'statusBadge.inquiry.answered': '답변완료',
      'statusBadge.inquiry.pendingAdmin': '미답변',
      'statusBadge.inquiry.pendingMy': '접수',
      'statusBadge.journal.published': '공개',
      'statusBadge.journal.private': '비공개',
    };
    return messages[key] ?? key;
  },
}));

describe('typed admin status badges', () => {
  it('renders configured labels through typed status configs', () => {
    render(
      <div>
        <StatusBadge isActive />
        <OrderStatusBadge status="paid" />
        <ProductStatusBadge status="soldout" />
        <InquiryStatusBadge status="answered" />
        <JournalStatusBadge isPublished />
      </div>,
    );

    expect(screen.getByText('활성')).toBeInTheDocument();
    expect(screen.getByText('결제완료')).toBeInTheDocument();
    expect(screen.getByText('품절')).toBeInTheDocument();
    expect(screen.getByText('답변완료')).toBeInTheDocument();
    expect(screen.getByText('공개')).toBeInTheDocument();
  });

  it('uses the my-page pending inquiry label without changing the admin label', () => {
    render(
      <div>
        <InquiryStatusBadge status="pending" context="admin" />
        <InquiryStatusBadge status="pending" context="my" />
      </div>,
    );

    expect(screen.getByText('미답변')).toBeInTheDocument();
    expect(screen.getByText('접수')).toBeInTheDocument();
  });

  it('falls back explicitly for unknown statuses', () => {
    render(<OrderStatusBadge status="manually_reviewing" />);

    expect(screen.getByText('manually_reviewing')).toBeInTheDocument();
  });
});
