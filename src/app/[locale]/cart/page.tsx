'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import CartItemRow from '@/components/shared/cart/CartItemRow';
import { formatCurrency } from '@/utils/currency';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/constants/shipping';
import { SESSION_KEYS } from '@/constants/storage';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';

export default function CartPage() {
  const t = useTranslations('cart');
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'ko';
  const { isVisible: isNavVisible } = useMobileNav();
  const { isAuthenticated } = useAuth();
  const { items, isLoading, updateQuantity, removeItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const selectedTotal = useMemo(
    () =>
      items
        .filter((item) => selectedIds.has(item.id))
        .reduce((sum, item) => sum + item.subtotal, 0),
    [items, selectedIds],
  );

  const selectedShippingFee =
    selectedTotal >= FREE_SHIPPING_THRESHOLD || selectedTotal === 0 ? 0 : SHIPPING_FEE;
  const grandTotal = selectedTotal + selectedShippingFee;
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - selectedTotal, 0);
  const freeShippingProgress = Math.min((selectedTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRemove = async (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await removeItem(id);
  };

  const handleOrder = () => {
    if (selectedIds.size === 0) {
      toast.warning(t('selectItemsToOrder'));
      return;
    }
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify(selectedItems));
    router.push(`/${locale}/checkout`);
  };

  if (!isAuthenticated) {
    return (
      <div className="layout-container layout-page">
        <EmptyState
          title={t('requireLogin')}
          description={t('requireLoginDescription')}
          action={{ label: t('loginAction'), onClick: () => router.push(`/${locale}/login`) }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="layout-container layout-page">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} height="h-24" />
            ))}
          </div>
          <SkeletonBox height="h-48" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="layout-container layout-page">
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          action={{ label: t('continueShopping'), onClick: () => router.push(`/${locale}/products`) }}
        />
      </div>
    );
  }

  const orderSummaryContent = (
    <>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('selectedItems')}</span>
          <span>{selectedIds.size}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('productAmount')}</span>
          <span className="typo-price">{formatCurrency(selectedTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('shippingFee')}</span>
          <span className="typo-price">{selectedShippingFee === 0 ? t('freeShipping') : formatCurrency(selectedShippingFee)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {remainingForFreeShipping === 0
            ? t('freeShippingUnlocked')
            : t('freeShippingRemaining', { amount: formatCurrency(remainingForFreeShipping) })}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${freeShippingProgress}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-4 border-t border-divider-soft pt-4">
        <div className="flex items-end justify-between">
          <span className="typo-title">{t('total')}</span>
          <span className="typo-price-lg text-foreground">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="layout-container layout-page pb-36 md:pb-8">
      <h1 className="typo-h1">{t('title')}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b border-divider-soft pb-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label={t('selectAll')}
                className="h-4 w-4 rounded border-input accent-foreground"
              />
              {t('selectAll')} ({selectedIds.size}/{items.length})
            </label>
          </div>

          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onSelect={handleSelect}
              onQuantityChange={updateQuantity}
              onRemove={handleRemove}
            />
          ))}

          <section className="mt-6 md:hidden">
            <Accordion.Root type="single" collapsible className="rounded-lg border border-divider-soft">
              <Accordion.Item value="summary">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                    <div>
                      <p className="typo-h3">{t('orderSummary')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('total')} · {formatCurrency(grandTotal)}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden border-t border-divider-soft data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="p-4">{orderSummaryContent}</div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </section>
        </div>

        <aside className="hidden h-fit rounded-lg border border-divider-soft p-6 lg:sticky lg:top-24 lg:block">
          <h2 className="typo-h3">{t('orderSummary')}</h2>
          <div className="mt-4">{orderSummaryContent}</div>

          <Button type="button" className="mt-4 w-full" onClick={handleOrder}>
            {t('orderSelected')}
          </Button>
        </aside>
      </div>

      <div
        className={cn(
          'mobile-sticky-cta fixed z-40 border-t border-divider-soft bg-background md:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-xs text-muted-foreground">{t('total')}</p>
            <p className="typo-price text-foreground">{formatCurrency(grandTotal)}</p>
          </div>
          <Button type="button" className="w-full" onClick={handleOrder}>
            {t('orderSelected')}
          </Button>
        </div>
      </div>
    </div>
  );
}
