'use client';

import type { AdminOrder } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { OrderStatusSelect } from './OrderStatusSelect';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/status';

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  onStatusChange: () => void;
  onShippingRegister: (order: AdminOrder) => void;
}

export function AdminOrdersTable({ orders, onStatusChange, onShippingRegister }: AdminOrdersTableProps) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">주문이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left">주문번호</th>
            <th className="px-4 py-3 text-left">주문자</th>
            <th className="px-4 py-3 text-left">상품</th>
            <th className="px-4 py-3 text-right">금액</th>
            <th className="px-4 py-3 text-left">상태</th>
            <th className="px-4 py-3 text-left">주문일</th>
            <th className="px-4 py-3 text-right">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-secondary/30">
              <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
              <td className="px-4 py-3">
                <div className="text-sm">{order.recipientName}</div>
                {order.user && (
                  <div className="text-xs text-muted-foreground">{order.user.email}</div>
                )}
              </td>
              <td className="max-w-48 truncate px-4 py-3">
                {order.items.length > 0
                  ? order.items.length === 1
                    ? order.items[0].productName
                    : `${order.items[0].productName} 외 ${order.items.length - 1}건`
                  : '-'}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(order.totalAmount)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${ORDER_STATUS_COLORS[order.status] ?? 'bg-secondary'}`}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <OrderStatusSelect
                    orderId={order.id}
                    currentStatus={order.status}
                    onStatusChange={onStatusChange}
                  />
                  {(order.status === 'preparing' || order.status === 'paid') && (
                    <button
                      onClick={() => onShippingRegister(order)}
                      className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                    >
                      운송장
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
