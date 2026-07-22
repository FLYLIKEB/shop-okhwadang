'use client';

import { Suspense, use } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { guestOrdersApi, ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';
import { BankTransferAccountInfo } from '@/components/shared/checkout/BankTransferAccountInfo';
import { useAuth } from '@/contexts/AuthContext';
import { ApiHttpError } from '@/lib/api-error';
import { SESSION_KEYS } from '@/constants/storage';
import { useFormatter, useTranslations } from 'next-intl';

interface GuestOrderContext {
  orderId: number;
  orderNumber: string;
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
}

function OrderCompleteContent({ locale }: { locale: string }) {
  const t = useTranslations('orderComplete');
  const checkoutResultT = useTranslations('checkoutResult');
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');
  const paymentMethod = searchParams.get('payment');

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [mode, setMode] = useState<'guest' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const redirectTarget = useMemo(() => {
    const query = searchParams.toString();
    return `/${locale}/order/complete${query ? `?${query}` : ''}`;
  }, [locale, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!orderId || !orderNumber) {
      router.replace(`/${locale}/`);
      return;
    }

    const id = Number(orderId);
    if (Number.isNaN(id)) {
      router.replace(`/${locale}/`);
      return;
    }

    let guestContext: GuestOrderContext | null = null;
    const rawGuestContext = sessionStorage.getItem(SESSION_KEYS.GUEST_ORDER_CONTEXT);
    if (rawGuestContext) {
      try {
        const parsed = JSON.parse(rawGuestContext) as GuestOrderContext;
        if (
          parsed.orderId === id
          && parsed.orderNumber === orderNumber
          && parsed.guestAccessToken
          && parsed.guestAccessTokenExpiresAt
        ) {
          guestContext = parsed;
        } else {
          sessionStorage.removeItem(SESSION_KEYS.GUEST_ORDER_CONTEXT);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEYS.GUEST_ORDER_CONTEXT);
      }
    }

    setIsLoading(true);

    if (guestContext) {
      setMode('guest');
      guestOrdersApi
        .getById(id, guestContext.guestAccessToken, locale === 'en' ? 'en' : 'ko')
        .then((data) => setOrder(data))
        .catch((err: unknown) => {
          if (err instanceof ApiHttpError && err.status === 401) {
            sessionStorage.removeItem(SESSION_KEYS.GUEST_ORDER_CONTEXT);
            toast.error(checkoutResultT('guestAccessExpired'));
            router.replace(`/${locale}/order/lookup`);
            return;
          }
          toast.error(handleApiError(err, toastMessage('orderLoadError')));
          router.replace(`/${locale}/`);
        })
        .finally(() => setIsLoading(false));
      return;
    }

    if (!isAuthenticated) {
      setMode(null);
      setIsLoading(false);
      router.replace(`/${locale}/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    setMode('member');
    ordersApi
      .getById(id)
      .then((data) => setOrder(data))
      .catch((err: unknown) => {
        toast.error(handleApiError(err, toastMessage('orderLoadError')));
        router.replace(`/${locale}/`);
      })
      .finally(() => setIsLoading(false));
  }, [authLoading, checkoutResultT, isAuthenticated, locale, orderId, orderNumber, redirectTarget, router, t]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!order || !mode) {
    return null;
  }

  const primaryLink = mode === 'guest' ? `/${locale}/order/lookup` : `/${locale}/my/orders`;
  const primaryLabel = mode === 'guest' ? t('guestPrimaryAction') : t('viewOrders');

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-10 space-y-4 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('orderNumber')} <span className="font-semibold text-foreground">{order.orderNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t('orderDate')}{' '}
          {format.dateTime(new Date(order.createdAt), {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {mode === 'guest' && (
          <p className="text-sm text-muted-foreground">{t('guestAccessHint')}</p>
        )}
      </div>

      {paymentMethod === 'bank_transfer' && (
        <section className="surface-card mb-8 p-6">
          <BankTransferAccountInfo />
        </section>
      )}

      <section className="surface-card mb-8 space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('items')}</h2>
        <ul className="divide-y divide-soft text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.optionName && <p className="text-xs text-muted-foreground">{item.optionName}</p>}
                <p className="text-muted-foreground">{t('quantity', { quantity: item.quantity })}</p>
              </div>
              <p className="shrink-0 font-medium">
                {formatCurrency(item.price * item.quantity, locale === 'en' ? 'en' : 'ko')}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-soft pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('shippingFee')}</span>
            <span>
              {order.shippingFee === 0
                ? t('free')
                : formatCurrency(order.shippingFee, locale === 'en' ? 'en' : 'ko')}
            </span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('discount')}</span>
              <span className="text-destructive">
                -{formatCurrency(order.discountAmount, locale === 'en' ? 'en' : 'ko')}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-soft pt-4 font-bold">
          <span>{t('paymentAmount')}</span>
          <span>{formatCurrency(order.totalAmount, locale === 'en' ? 'en' : 'ko')}</span>
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href={primaryLink}
          className="flex-1 rounded-md border border-soft py-3 text-center text-sm font-semibold transition-colors hover:bg-muted"
        >
          {primaryLabel}
        </Link>
        <Link
          href={`/${locale}/`}
          className="flex-1 rounded-md bg-foreground py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          {t('continueShopping')}
        </Link>
      </div>
    </div>
  );
}

export default function OrderCompletePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
          <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-8 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <OrderCompleteContent locale={locale} />
    </Suspense>
  );
}
