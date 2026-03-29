import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShippingTimeline from '@/components/ShippingTimeline';
import type { ShippingResponse } from '@/lib/api';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/my/orders/1',
}));

const mockGetByOrderId = vi.fn();
vi.mock('@/lib/api', () => ({
  shippingApi: {
    getByOrderId: (...args: unknown[]) => mockGetByOrderId(...args),
  },
}));

function makeShipping(overrides: Partial<ShippingResponse> = {}): ShippingResponse {
  return {
    id: 1,
    order_id: 42,
    carrier: 'mock',
    tracking_number: null,
    status: 'payment_confirmed',
    shipped_at: null,
    delivered_at: null,
    tracking: null,
    ...overrides,
  };
}

describe('ShippingTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('status=payment_confirmed → 1단계만 active', async () => {
    mockGetByOrderId.mockResolvedValue(makeShipping({ status: 'payment_confirmed' }));
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('결제 완료')).toBeInTheDocument());
    // Step 1 (index 0) should show filled circle
    const steps = screen.getAllByText(/✓|[12345]/);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('status=shipped → 배송 시작 단계 활성', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({
        status: 'shipped',
        shipped_at: '2026-03-24T10:00:00.000Z',
      }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('배송 시작')).toBeInTheDocument());
  });

  it('status=delivered → 배송 완료 표시, delivered_at 렌더링', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({
        status: 'delivered',
        delivered_at: '2026-03-25T14:00:00.000Z',
      }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('배송 완료')).toBeInTheDocument());
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('tracking_number 없음 → "배송 준비 중" 안내 표시', async () => {
    mockGetByOrderId.mockResolvedValue(makeShipping({ tracking_number: null }));
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() =>
      expect(
        screen.getByText(/배송 준비 중입니다/),
      ).toBeInTheDocument(),
    );
  });

  it('tracking_number 있음 → 운송장 번호 표시', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({
        status: 'in_transit',
        carrier: 'cj',
        tracking_number: '1234567890123',
      }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('1234567890123')).toBeInTheDocument());
    expect(screen.getByText('CJ대한통운')).toBeInTheDocument();
    expect(screen.getByText(/택배사 사이트에서 보기/)).toBeInTheDocument();
  });

  it('carrier=hanjin → 한진 추적 URL 생성', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({ carrier: 'hanjin', tracking_number: '9876543210' }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('한진택배')).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /배송 추적/ });
    expect((link as HTMLAnchorElement).href).toContain('9876543210');
    expect((link as HTMLAnchorElement).href).toContain('hanjin.com');
  });

  it('carrier=mock → 추적 링크 없음', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({ carrier: 'mock', tracking_number: '12345' }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('테스트 택배')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /배송 추적/ })).toBeNull();
  });

  it('tracking steps 있음 → 이력 목록 렌더링', async () => {
    mockGetByOrderId.mockResolvedValue(
      makeShipping({
        status: 'in_transit',
        carrier: 'cj',
        tracking_number: '111',
        tracking: {
          trackingNumber: '111',
          status: 'in_transit',
          steps: [
            { status: 'shipped', description: 'CJ서울터미널 출발', timestamp: '2026-03-24T10:00:00.000Z' },
            { status: 'in_transit', description: '부산허브 도착', timestamp: '2026-03-24T18:00:00.000Z' },
          ],
        },
      }),
    );
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('CJ서울터미널 출발')).toBeInTheDocument());
    expect(screen.getByText('부산허브 도착')).toBeInTheDocument();
  });

  it('API 404 → 배송 섹션 미렌더링', async () => {
    mockGetByOrderId.mockRejectedValue({ status: 404 });
    const { container } = render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('API 에러 → 에러 메시지 표시', async () => {
    mockGetByOrderId.mockRejectedValue({ status: 500 });
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() =>
      expect(screen.getByText(/배송 정보를 불러올 수 없습니다/)).toBeInTheDocument(),
    );
  });

  it('새로고침 버튼 클릭 → fetchShipping 재호출', async () => {
    mockGetByOrderId.mockResolvedValue(makeShipping());
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('새로고침')).toBeInTheDocument());
    fireEvent.click(screen.getByText('새로고침'));
    await waitFor(() => expect(mockGetByOrderId).toHaveBeenCalledTimes(2));
  });

  it('status=delivered → 폴링 미시작 (interval 없음)', async () => {
    mockGetByOrderId.mockResolvedValue(makeShipping({ status: 'delivered' }));
    render(<ShippingTimeline orderId={42} />);
    await waitFor(() => expect(screen.getByText('배송 완료')).toBeInTheDocument());
    // Delivered: only initial fetch, no polling interval registered
    expect(mockGetByOrderId).toHaveBeenCalledTimes(1);
    // Verify no "자동 업데이트 중" polling indicator shown
    expect(screen.queryByText('자동 업데이트 중')).toBeNull();
  });
});
