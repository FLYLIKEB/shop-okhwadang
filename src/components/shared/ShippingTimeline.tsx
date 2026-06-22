'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { shippingApi, type ShippingResponse } from '@/lib/api';
import {
  CARRIER_TRACKING_URLS,
  getCarrierName,
} from '@/constants/status';

const SHIPPING_STEPS = ['payment_confirmed', 'preparing', 'shipped', 'in_transit', 'delivered'];

interface Props {
  orderId: number;
}

export default function ShippingTimeline({ orderId }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('shippingTracking');
  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const [shipping, setShipping] = useState<ShippingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollErrorCount, setPollErrorCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const fetchShipping = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await shippingApi.getByOrderId(orderId);
      setShipping(data);
      setError(null);
      setPollErrorCount(0);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setShipping(null);
      } else if (status === 403) {
        setError(t('forbidden'));
      } else {
        if (silent) {
          setPollErrorCount((c) => c + 1);
        } else {
          setError(t('loadError'));
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    fetchShipping();
  }, [fetchShipping]);

  // Polling: 30s interval while not delivered
  useEffect(() => {
    if (!shipping || shipping.status === 'delivered') return;
    if (pollErrorCount >= 3) {
      setIsPolling(false);
      return;
    }
    setIsPolling(true);
    const id = setInterval(() => {
      router.refresh();
      fetchShipping(true);
    }, 30_000);
    return () => clearInterval(id);
  }, [shipping, pollErrorCount, router, fetchShipping]);

  if (loading) {
    return (
      <section className="rounded-lg border p-6" aria-busy="true">
        <h2 className="mb-4 text-base font-semibold">{t('title')}</h2>
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-base font-semibold">{t('title')}</h2>
        <p className="text-sm text-destructive">{error}</p>
      </section>
    );
  }

  if (!shipping) return null;

  const currentIndex = SHIPPING_STEPS.indexOf(shipping.status);
  const trackingUrl =
    shipping.tracking_number && shipping.carrier !== 'mock'
      ? (CARRIER_TRACKING_URLS[shipping.carrier] ?? null)
      : null;
  const trackingHref = trackingUrl && shipping.tracking_number
    ? `${trackingUrl}${encodeURIComponent(shipping.tracking_number)}`
    : null;
  const carrierName = getCarrierName(shipping.carrier, locale);

  return (
    <section className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <div className="flex items-center gap-2">
          {isPolling && (
            <span className="text-xs text-muted-foreground">{t('polling')}</span>
          )}
          {pollErrorCount >= 3 && (
            <span className="text-xs text-destructive">{t('pollingStopped')}</span>
          )}
          <button
            onClick={() => fetchShipping()}
            className="text-xs text-muted-foreground underline hover:text-foreground"
            aria-label={t('refreshLabel')}
          >
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Status progress */}
      <div className="mb-6 flex items-center justify-between">
        {SHIPPING_STEPS.map((step, index) => (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  index <= currentIndex
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}
                aria-label={index <= currentIndex ? t('stepCompleted', { status: t(step) }) : t(step)}
              >
                {index < currentIndex ? '✓' : index + 1}
              </div>
              <span className="text-center text-xs whitespace-nowrap">
                {t(step)}
              </span>
              {step === 'shipped' && shipping.shipped_at && (
                <span className="text-center text-xs text-muted-foreground">
                  {new Date(shipping.shipped_at).toLocaleDateString(dateLocale)}
                </span>
              )}
              {step === 'delivered' && shipping.delivered_at && (
                <span className="text-center text-xs text-muted-foreground">
                  {new Date(shipping.delivered_at).toLocaleDateString(dateLocale)}
                </span>
              )}
            </div>
            {index < SHIPPING_STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  index < currentIndex ? 'bg-foreground' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Carrier info */}
      <div className="mb-4 rounded-md bg-muted/40 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('carrier')}</span>
          <span className="font-medium">{carrierName}</span>
        </div>
        {shipping.tracking_number ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground">{t('trackingNumber')}</span>
            <span className="font-mono font-medium">{shipping.tracking_number}</span>
            {trackingHref && (
              <a
                href={trackingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
                aria-label={t('trackingLinkLabel', { carrier: carrierName })}
              >
                {t('trackingLink')}
              </a>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('noTrackingNumber')}
          </p>
        )}
      </div>

      {/* Tracking steps */}
      {shipping.tracking?.steps && shipping.tracking.steps.length > 0 && (
        <ul className="space-y-2" role="list">
          {shipping.tracking.steps.map((step, i) => (
            <li key={i} role="listitem" className="flex gap-3 text-sm">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-foreground" />
              <div>
                <span className="font-medium">{step.description}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(step.timestamp).toLocaleString(dateLocale)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shipping.tracking?.estimatedDelivery && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('estimatedDelivery', { date: shipping.tracking.estimatedDelivery })}
        </p>
      )}
    </section>
  );
}
