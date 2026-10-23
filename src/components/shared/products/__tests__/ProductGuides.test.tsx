import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { ProductGuides } from '../ProductDetailContent';
import { getUiMessages } from '@/i18n/ui-messages';

describe('Product guide disclosures', () => {
  it('keeps a single English label, Korean body and no arrow or extra open button', async () => {
    const user = userEvent.setup();
    const { container } = render(<NextIntlClientProvider locale="ko" messages={getUiMessages('ko')}><ProductGuides /></NextIntlClientProvider>);
    const shipping = screen.getByRole('button', { name: 'SHIPPING' });
    const returns = screen.getByRole('button', { name: 'EXCHANGES AND RETURNS' });
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(shipping).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('택배 배송으로 안전하게 발송합니다.')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(within(shipping).queryByText('배송기간 및 서비스 제공 안내')).not.toBeInTheDocument();
    shipping.focus();
    await user.keyboard('{Enter}');
    expect(shipping).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('배송 방법')).toBeVisible();
    expect(screen.getByText('택배 배송으로 안전하게 발송합니다.')).toBeVisible();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(returns);
    expect(screen.getByText('상품 수령 후 7일 이내 교환 또는 반품을 신청할 수 있습니다.')).toBeVisible();
    await user.click(shipping);
    expect(screen.queryByText('택배 배송으로 안전하게 발송합니다.')).not.toBeInTheDocument();
  });
});
