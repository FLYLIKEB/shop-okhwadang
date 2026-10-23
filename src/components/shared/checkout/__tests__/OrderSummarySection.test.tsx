import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderSummarySection } from '../OrderSummarySection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const props = {
  pricedItems: [{ productId: 1, productOptionId: null, productName: 'Tea', optionName: null, unitPrice: 16000, unitPriceUsd: 10, subtotal: 32000, quantity: 2 }],
  subtotalAmount: 32000,
  shippingFee: 3200,
  totalPayable: 35200,
  pricingKrwPerUsd: 1600,
  totalUsd: 22,
};

describe('OrderSummarySection currency snapshots', () => {
  it('uses authoritative USD cents and server rate instead of the browser default rate', () => {
    render(<OrderSummarySection {...props} locale="en" />);
    expect(screen.getByText('$10.00 × 2 = $20.00')).toBeInTheDocument();
    expect(screen.getByText('$2.00')).toBeInTheDocument();
    expect(screen.getByText('$22.00')).toBeInTheDocument();
  });

  it('keeps the KRW ledger amounts in Korean', () => {
    render(<OrderSummarySection {...props} locale="ko" />);
    expect(screen.getByText('₩16,000 × 2 = ₩32,000')).toBeInTheDocument();
    expect(screen.getByText('₩35,200')).toBeInTheDocument();
  });
});
