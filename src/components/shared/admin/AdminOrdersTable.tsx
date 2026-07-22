'use client';

import type { AdminOrder } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { OrderStatusSelect } from './OrderStatusSelect';
import { ORDER_STATUS_COLORS } from '@/constants/status';
import { localMessage } from '@/utils/localMessages';

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  onStatusChange: () => void;
  onShippingRegister: (order: AdminOrder) => void;
  onCancelOrder: (order: AdminOrder) => void;
}

const CANCELLABLE_ORDER_STATUSES = new Set(['pending', 'paid', 'preparing']);

function getStatusLabel(status: string): string {
  return localMessage(`admin.orders.status.${status}`);
}

function getProductLabel(order: AdminOrder): string {
  if (order.items.length === 0) {
    return '-';
  }

  if (order.items.length === 1) {
    return order.items[0].productName;
  }

  return localMessage('admin.orders.productSummary.more', {
    productName: order.items[0].productName,
    count: order.items.length - 1,
  });
}

function getCustomerEmail(order: AdminOrder): string | null {
  return order.user?.email ?? order.guestEmailNormalized ?? null;
}

export function AdminOrdersTable({
  orders,
  onStatusChange,
  onShippingRegister,
  onCancelOrder,
}: AdminOrdersTableProps) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{localMessage('admin.orders.noOrders')}</p>;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {orders.map((order) => {
          const customerEmail = getCustomerEmail(order);

          return (
            <article
              key={order.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
              aria-labelledby={`order-${order.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 id={`order-${order.id}`} className="truncate font-mono typo-body-sm font-semibold">
                    {order.orderNumber}
                  </h3>
                  <p className="typo-body-sm text-foreground">{order.recipientName}</p>
                  {customerEmail && (
                    <p className="text-xs text-muted-foreground">{customerEmail}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 typo-label ${ORDER_STATUS_COLORS[order.status] ?? 'bg-secondary'}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 typo-body-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{localMessage('admin.orders.columns.product')}</dt>
                  <dd className="text-right">{getProductLabel(order)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{localMessage('admin.orders.columns.amount')}</dt>
                  <dd className="font-medium">{formatCurrency(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{localMessage('admin.orders.columns.orderDate')}</dt>
                  <dd>{new Date(order.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <OrderStatusSelect
                  orderId={order.id}
                  currentStatus={order.status}
                  onStatusChange={onStatusChange}
                />
                {(order.status === 'preparing' || order.status === 'paid') && (
                  <button
                    type="button"
                    onClick={() => onShippingRegister(order)}
                    className="min-h-11 rounded border px-3 typo-button hover:bg-secondary"
                  >
                    {localMessage('admin.orders.trackingSlip')}
                  </button>
                )}
                {CANCELLABLE_ORDER_STATUSES.has(order.status) && (
                  <button
                    type="button"
                    onClick={() => onCancelOrder(order)}
                    className="min-h-11 rounded border border-destructive px-3 typo-button text-destructive hover:bg-destructive/10"
                  >
                    {localMessage('admin.orders.cancel.action')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full typo-body-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left">{localMessage('admin.orders.columns.orderNumber')}</th>
              <th className="px-4 py-3 text-left">{localMessage('admin.orders.columns.orderer')}</th>
              <th className="px-4 py-3 text-left">{localMessage('admin.orders.columns.product')}</th>
              <th className="px-4 py-3 text-right">{localMessage('admin.orders.columns.amount')}</th>
              <th className="px-4 py-3 text-left">{localMessage('admin.orders.columns.status')}</th>
              <th className="px-4 py-3 text-left">{localMessage('admin.orders.columns.orderDate')}</th>
              <th className="px-4 py-3 text-right">{localMessage('admin.orders.columns.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => {
              const customerEmail = getCustomerEmail(order);

              return (
                <tr key={order.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{order.recipientName}</div>
                    {customerEmail && <div className="text-xs text-muted-foreground">{customerEmail}</div>}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3">{getProductLabel(order)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${ORDER_STATUS_COLORS[order.status] ?? 'bg-secondary'}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
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
                          type="button"
                          onClick={() => onShippingRegister(order)}
                          className="rounded border px-2 py-1 text-xs hover:bg-secondary"
                        >
                          {localMessage('admin.orders.trackingSlip')}
                        </button>
                      )}
                      {CANCELLABLE_ORDER_STATUSES.has(order.status) && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order)}
                          className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          {localMessage('admin.orders.cancel.action')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
