import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import messages from '@/i18n/messages/en.json';
import { OrderSummarySection, type CheckoutPricingItem } from '../OrderSummarySection';
import PreOrderNotice from '@/components/shared/products/PreOrderNotice';

const baseItem: CheckoutPricingItem = { productId: 1, productOptionId: null, productName: 'Tea', optionName: null, unitPrice: 1000, subtotal: 1000, quantity: 1 };

function renderSummary(items: CheckoutPricingItem[]) {
  return render(<NextIntlClientProvider locale="en" messages={messages}>
    <OrderSummarySection pricedItems={items} locale="en" subtotalAmount={3000} shippingFee={0} totalPayable={3000} />
  </NextIntlClientProvider>);
}

describe('pre-order shipping disclosure', () => {
  it('uses the latest pre-order date for a mixed shipment', () => {
    renderSummary([
      baseItem,
      { ...baseItem, productId: 2, isPreOrder: true, preOrderShippingDate: '2026-11-30' },
      { ...baseItem, productId: 3, isPreOrder: true, preOrderShippingDate: '2026-12-15' },
    ]);
    expect(screen.getByText('Orders containing pre-order items ship together on the latest estimated shipping date (2026-12-15).')).toBeInTheDocument();
    expect(screen.getAllByText('PRE-ORDER')).toHaveLength(2);
  });

  it('does not label regular products as pre-orders', () => {
    const { container } = render(<PreOrderNotice isPreOrder={false} preOrderShippingDate="2026-12-15" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('omits combined-shipping notice for a regular order', () => {
    renderSummary([baseItem]);
    expect(screen.queryByText(/Orders containing pre-order/)).not.toBeInTheDocument();
  });
});
