'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/shared/EmptyState';
import CartItemRow from '@/components/shared/cart/CartItemRow';
import { formatCurrency, type Locale } from '@/utils/currency';
import { SESSION_KEYS } from '@/constants/storage';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { shippingApi, type ShippingQuoteResponse } from '@/lib/api';
import { cn } from '@/components/ui/utils';

export default function CartPage() {
  const t = useTranslations('cart');
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale ?? 'ko') as Locale;
  const { isVisible: isNavVisible } = useMobileNav();
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

  const mobileOrderSummaryContent = (
    <div className="checkout-toss-mobile-summary-content">
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t('selectedItems')}</span>
          <span className="font-semibold text-foreground">{selectedIds.size}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t('productAmount')}</span>
          <span className="font-semibold text-foreground">{formatCurrency(selectedTotal, locale)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t('shippingFee')}</span>
          <span className="font-semibold text-foreground">
            {selectedShippingFee === 0 ? t('freeShipping') : formatCurrency(selectedShippingFee, locale)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-soft pt-3">
        <span className="typo-body-sm font-semibold">{t('total')}</span>
        <span className="typo-price text-foreground">{formatCurrency(grandTotal, locale)}</span>
      </div>
    </div>
  );

  return (
    <div className="checkout-toss-theme min-h-screen pb-36 lg:pb-8">
      <div className="layout-container layout-page max-w-3xl">
      <div className="relative flex items-center justify-center border-b border-soft pb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/products`)}
          aria-label={t('backToShopping')}
          className="absolute left-0 h-10 min-h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h1 className="checkout-toss-title typo-h1">{t('title')}</h1>
      </div>

      <div className="mt-8">
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

          <section className="checkout-toss-submit-card mt-8 hidden border-t border-soft pt-8 lg:block">
            <h2 className="typo-h3">{t('orderSummary')}</h2>
            <div className="mt-4">{orderSummaryContent}</div>

            <Button type="button" variant="brown" className="mt-6 w-full" onClick={handleOrder}>
              {t('orderSelected')}
            </Button>
          </section>
      </div>

      <div
        className={cn(
          'checkout-toss-mobile-cta mobile-sticky-cta fixed z-40 border-t border-soft bg-background lg:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          {mobileOrderSummaryContent}
          <Button type="button" variant="brown" className="mt-3 w-full" onClick={handleOrder}>
            {t('orderSelected')}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
