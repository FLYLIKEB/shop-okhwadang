'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { shippingApi, type ShippingResponse } from '@/lib/api';
import {
  SHIPPING_STATUS_LABELS,
  CARRIER_NAMES,
  CARRIER_TRACKING_URLS,
} from '@/constants/status';

const SHIPPING_STEPS = ['payment_confirmed', 'preparing', 'shipped', 'in_transit', 'delivered'];

interface Props {
  orderId: number;
}

export default function ShippingTimeline({ orderId }: Props) {
  const router = useRouter();
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
        setError('접근 권한이 없습니다.');
      } else {
        if (silent) {
          setPollErrorCount((c) => c + 1);
        } else {
          setError('배송 정보를 불러올 수 없습니다.');
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

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
        <h2 className="mb-4 text-base font-semibold">배송 추적</h2>
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
        <h2 className="mb-2 text-base font-semibold">배송 추적</h2>
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

  return (
    <section className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">배송 추적</h2>
        <div className="flex items-center gap-2">
          {isPolling && (
            <span className="text-xs text-muted-foreground">자동 업데이트 중</span>
          )}
          {pollErrorCount >= 3 && (
            <span className="text-xs text-destructive">자동 업데이트 중단됨</span>
          )}
          <button
            onClick={() => fetchShipping()}
            className="text-xs text-muted-foreground underline hover:text-foreground"
            aria-label="배송 상태 새로고침"
          >
            새로고침
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
                aria-label={index <= currentIndex ? `${SHIPPING_STATUS_LABELS[step]} 완료` : SHIPPING_STATUS_LABELS[step]}
              >
                {index < currentIndex ? '✓' : index + 1}
              </div>
              <span className="text-center text-xs whitespace-nowrap">
                {SHIPPING_STATUS_LABELS[step]}
              </span>
              {step === 'shipped' && shipping.shipped_at && (
                <span className="text-center text-xs text-muted-foreground">
                  {new Date(shipping.shipped_at).toLocaleDateString('ko-KR')}
                </span>
              )}
              {step === 'delivered' && shipping.delivered_at && (
                <span className="text-center text-xs text-muted-foreground">
                  {new Date(shipping.delivered_at).toLocaleDateString('ko-KR')}
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
          <span className="text-muted-foreground">택배사</span>
          <span className="font-medium">{CARRIER_NAMES[shipping.carrier] ?? shipping.carrier}</span>
        </div>
        {shipping.tracking_number ? (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground">운송장</span>
            <span className="font-mono font-medium">{shipping.tracking_number}</span>
            {trackingUrl && (
              <a
                href={`${trackingUrl}${shipping.tracking_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
                aria-label={`${CARRIER_NAMES[shipping.carrier] ?? shipping.carrier} 사이트에서 배송 추적 (새 탭에서 열림)`}
              >
                택배사 사이트에서 보기 →
              </a>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            배송 준비 중입니다. 운송장 번호가 등록되면 알려드립니다.
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
                  {new Date(step.timestamp).toLocaleString('ko-KR')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shipping.tracking?.estimatedDelivery && (
        <p className="mt-3 text-sm text-muted-foreground">
          예상 배송일: {shipping.tracking.estimatedDelivery}
        </p>
      )}
    </section>
  );
}
