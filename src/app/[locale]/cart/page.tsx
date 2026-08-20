'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/shared/EmptyState';
import CartItemRow from '@/components/shared/cart/CartItemRow';
import { formatCurrency, type Locale } from '@/utils/currency';
import { SESSION_KEYS } from '@/constants/storage';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { shippingApi, type ShippingQuoteResponse } from '@/lib/api';

export default function CartPage() {
  const t = useTranslations('cart');
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale ?? 'ko') as Locale;
  const { items, isLoading, updateQuantity, removeItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResponse | null>(null);
  const knownItemIdsRef = useRef<Set<number>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const selectedTotal = useMemo(
    () =>
      items
        .filter((item) => selectedIds.has(item.id))
        .reduce((sum, item) => sum + item.subtotal, 0),
    [items, selectedIds],
  );

  const selectedShippingFee = selectedTotal === 0 ? 0 : (shippingQuote?.shippingFee ?? 0);
  const freeShippingThreshold = shippingQuote?.threshold ?? 0;
  const grandTotal = selectedTotal + selectedShippingFee;
  const remainingForFreeShipping = Math.max(freeShippingThreshold - selectedTotal, 0);
  const freeShippingProgress = freeShippingThreshold > 0
    ? Math.min((selectedTotal / freeShippingThreshold) * 100, 100)
    : 100;

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    const addedIds = items
      .map((item) => item.id)
      .filter((id) => !knownItemIdsRef.current.has(id));

    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      addedIds.forEach((id) => next.add(id));
      return next;
    });
    knownItemIdsRef.current = currentIds;
  }, [items]);

  useEffect(() => {
    if (selectedTotal <= 0) {
      setShippingQuote(null);
      return;
    }

    let cancelled = false;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    shippingApi.quote(
      selectedTotal,
      '00000',
      selectedItems.map((item) => ({
        productId: item.productId,
        productOptionId: item.productOptionId,
        quantity: item.quantity,
      })),
    )
      .then((quote) => {
        if (!cancelled) setShippingQuote(quote);
      })
      .catch(() => {
        if (!cancelled) setShippingQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [items, selectedIds, selectedTotal]);

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
    const wasSelected = selectedIds.has(id);
    try {
      await removeItem(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (wasSelected) next.add(id);
        else next.delete(id);
        return next;
      });
    }
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

  if (isLoading) {
    return (
      <div className="checkout-toss-theme min-h-screen">
        <div className="layout-container layout-page max-w-3xl">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} height="h-24" />
            ))}
          </div>
          <SkeletonBox height="h-48" />
        </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-toss-theme min-h-screen">
        <div className="layout-container layout-page max-w-3xl">
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          action={{ label: t('continueShopping'), onClick: () => router.push(`/${locale}/products`) }}
        />
        </div>
      </div>
    );
  }

  const orderSummaryContent = (
    <>
      <div className="checkout-toss-summary__rows space-y-2 text-sm">
        <div className="checkout-toss-summary__row flex justify-between">
          <span className="text-muted-foreground">{t('selectedItems')}</span>
          <span className="checkout-toss-summary__value">{selectedIds.size}</span>
        </div>
        <div className="checkout-toss-summary__row flex justify-between">
          <span className="text-muted-foreground">{t('productAmount')}</span>
          <span className="checkout-toss-summary__value typo-price">{formatCurrency(selectedTotal, locale)}</span>
        </div>
        <div className="checkout-toss-summary__row flex justify-between">
          <span className="text-muted-foreground">{t('shippingFee')}</span>
          <span className="checkout-toss-summary__value typo-price">{selectedShippingFee === 0 ? t('freeShipping') : formatCurrency(selectedShippingFee, locale)}</span>
        </div>
      </div>

      <div className="checkout-toss-summary__shipping mt-4 rounded-md bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">
          {remainingForFreeShipping === 0
            ? t('freeShippingUnlocked')
            : t('freeShippingRemaining', { amount: formatCurrency(remainingForFreeShipping, locale) })}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${freeShippingProgress}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="checkout-toss-summary__total mt-4 pt-4">
        <div className="flex items-end justify-between">
          <span className="checkout-toss-summary__total-label typo-title">{t('total')}</span>
          <span className="checkout-toss-summary__total-value typo-price-lg text-foreground">{formatCurrency(grandTotal, locale)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="checkout-toss-theme min-h-screen pb-36 lg:pb-8">
      <div className="layout-container layout-page">
      <h1 className="checkout-toss-title typo-h1">{t('title')}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="checkout-toss-select-all mb-3 pb-3">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50">
              <Checkbox
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label={t('selectAll')}
              />
              <span className="checkout-toss-select-all__label typo-body-sm font-semibold">{t('selectAll')}</span>
              <span className="checkout-toss-select-all__count typo-body-sm">({selectedIds.size}/{items.length})</span>
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

          <section className="checkout-toss-mobile-summary mt-6 lg:hidden">
            <Accordion.Root type="single" collapsible className="surface-card">
              <Accordion.Item value="summary">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                    <div>
                      <p className="typo-h3">{t('orderSummary')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('total')} · {formatCurrency(grandTotal, locale)}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden border-t border-soft data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="p-4">{orderSummaryContent}</div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </section>
        </div>

        <aside className="checkout-toss-submit-card hidden h-fit surface-card p-6 lg:sticky lg:top-24 lg:block">
          <h2 className="typo-h3">{t('orderSummary')}</h2>
          <div className="mt-4">{orderSummaryContent}</div>

          <Button type="button" variant="black" className="mt-4 w-full" onClick={handleOrder}>
            {t('orderSelected')}
          </Button>
        </aside>
      </div>

      <div
        className={cn(
          'checkout-toss-mobile-cta mobile-sticky-cta fixed z-40 border-t border-soft bg-background lg:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-xs text-muted-foreground">{t('total')}</p>
            <p className="typo-price text-foreground">{formatCurrency(grandTotal, locale)}</p>
          </div>
          <Button type="button" variant="black" className="w-full" onClick={handleOrder}>
            {t('orderSelected')}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
