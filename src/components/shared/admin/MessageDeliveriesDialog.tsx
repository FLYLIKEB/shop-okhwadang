'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { adminOrdersApi, type AdminMessageDeliveriesResponse } from '@/lib/api';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { formatDateTime } from '@/utils/date';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

interface MessageDeliveriesDialogProps {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
}

export function MessageDeliveriesDialog({ orderId, orderNumber, onClose }: MessageDeliveriesDialogProps) {
  const t = useTranslations('admin.orders.messageDeliveries');
  const locale = useLocale();
  const [data, setData] = useState<AdminMessageDeliveriesResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedEffectKey, setSelectedEffectKey] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [providerMessageId, setProviderMessageId] = useState('');

  const { execute: load, isLoading: loading } = useAsyncAction(async () => {
    setLoadFailed(false);
    setData(await adminOrdersApi.getMessageDeliveries(orderId));
  }, { errorMessage: t('loadError'), onError: () => setLoadFailed(true) });

  const { execute: reconcile, isLoading: reconciling } = useAsyncAction(async () => {
    if (!selectedEffectKey) return;
    await adminOrdersApi.reconcileMessageDelivery(orderId, selectedEffectKey, {
      reason: reason.trim(),
      providerMessageId: providerMessageId.trim(),
    });
    setSelectedEffectKey(null);
    setReason('');
    setProviderMessageId('');
    await load();
  }, { errorMessage: t('reconcileError'), successMessage: t('reconcileSuccess') });

  useEffect(() => {
    void load();
  }, [load, orderId]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reason.trim() && providerMessageId.trim()) void reconcile();
  };

  const eventLabels: Record<string, string> = {
    'order.created': t('events.orderCreated'),
    'payment.confirmed': t('events.paymentConfirmed'),
    'shipping.started': t('events.shippingStarted'),
    'shipping.delivered': t('events.shippingDelivered'),
    'order.cancelled': t('events.orderCancelled'),
  };
  const statusLabels: Record<string, string> = {
    pending: t('statuses.pending'),
    processing: t('statuses.processing'),
    sent: t('statuses.sent'),
    failed: t('statuses.failed'),
    skipped: t('statuses.skipped'),
    manual_review: t('statuses.manualReview'),
    PENDING: t('statuses.pending'),
    PROCESSING: t('statuses.processing'),
    SUCCEEDED: t('statuses.succeeded'),
    FAILED: t('statuses.failed'),
    MANUAL_REVIEW: t('statuses.manualReview'),
  };
  const manualEffectKeys = new Set(data?.effects.filter((effect) => effect.state === 'MANUAL_REVIEW').map((effect) => effect.effectKey) ?? []);

  return (
    <Modal isOpen onClose={onClose} maxWidth="lg" ariaLabelledBy="message-deliveries-title" overlayClassName="p-4" className="max-h-screen overflow-y-auto">
      <h2 id="message-deliveries-title" className="pr-8 typo-h3 font-semibold">{t('title')}</h2>
      <p className="mt-1 typo-body-sm text-muted-foreground">{orderNumber}</p>

      {loading && !data ? <p className="mt-6 typo-body-sm">{t('loading')}</p> : null}
      {loadFailed ? (
        <div className="mt-6 flex items-center gap-3">
          <p className="typo-body-sm text-destructive">{t('loadError')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>{t('retry')}</Button>
        </div>
      ) : null}
      {data && !loadFailed ? (
        <div className="mt-5 space-y-6">
          <section aria-label={t('deliveries')}>
            <h3 className="typo-body font-semibold">{t('deliveries')}</h3>
            {data.logs.length === 0 ? <p className="mt-2 typo-body-sm text-muted-foreground">{t('noDeliveries')}</p> : (
              <ul className="mt-2 divide-y divide-border">
                {data.logs.map((log) => (
                  <li key={log.id} className="space-y-2 py-3 typo-body-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{eventLabels[log.eventType] ?? log.eventType}</span>
                      <span className="rounded bg-muted px-2 py-1 typo-label">{statusLabels[log.status] ?? log.status}</span>
                    </div>
                    <p className="break-all text-muted-foreground">{log.channel} · {log.provider} · {log.recipientPhoneMasked ?? t('unknownRecipient')}</p>
                    <p className="break-all text-muted-foreground">{t('providerId')}: {log.providerMessageId || t('none')}</p>
                    <p className="text-muted-foreground">{formatDateTime(log.sentAt ?? log.createdAt, locale)}</p>
                    {log.errorMessage && <p className="break-words text-destructive">{log.errorMessage}</p>}
                    {(log.status === 'manual_review' || (log.status === 'sent' && manualEffectKeys.has(log.effectKey ?? ''))) && log.effectKey && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedEffectKey(log.effectKey); setReason(''); setProviderMessageId(''); }}>
                        {t('reconcileAction')}
                      </Button>
                    )}
                    {selectedEffectKey !== null && selectedEffectKey === log.effectKey && (log.status === 'manual_review' || (log.status === 'sent' && manualEffectKeys.has(log.effectKey ?? ''))) && (
                      <form onSubmit={onSubmit} className="space-y-3 rounded border border-border bg-muted p-3">
                        <p className="typo-body-sm">{t('reconcileHint')}</p>
                        <label className="block typo-body-sm" htmlFor={`reconcile-provider-${log.id}`}>{t('providerId')}</label>
                        <input id={`reconcile-provider-${log.id}`} value={providerMessageId} onChange={(event) => setProviderMessageId(event.target.value)} required maxLength={255} disabled={reconciling} className="field-soft w-full rounded px-3 py-2 typo-body-sm" />
                        <label className="block typo-body-sm" htmlFor={`reconcile-reason-${log.id}`}>{t('reason')}</label>
                        <textarea id={`reconcile-reason-${log.id}`} value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={500} rows={2} disabled={reconciling} className="field-soft w-full rounded px-3 py-2 typo-body-sm" />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEffectKey(null)} disabled={reconciling}>{t('cancel')}</Button>
                          <Button type="submit" size="sm" disabled={reconciling || !reason.trim() || !providerMessageId.trim()}>{t('confirm')}</Button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label={t('queue')}>
            <h3 className="typo-body font-semibold">{t('queue')}</h3>
            {data.effects.length === 0 ? <p className="mt-2 typo-body-sm text-muted-foreground">{t('noQueue')}</p> : (
              <ul className="mt-2 divide-y divide-border">
                {data.effects.map((effect) => (
                  <li key={effect.effectKey} className="space-y-1 py-3 typo-body-sm">
                    <div className="flex flex-wrap justify-between gap-2"><span>{eventLabels[effect.eventType] ?? effect.eventType}</span><span>{statusLabels[effect.state] ?? effect.state}</span></div>
                    <p className="text-muted-foreground">{t('attempts', { count: effect.attemptCount })} · {formatDateTime(effect.createdAt, locale)}</p>
                    {effect.nextAttemptAt && <p className="text-muted-foreground">{t('nextAttempt')}: {formatDateTime(effect.nextAttemptAt, locale)}</p>}
                    {effect.lastError && <p className="break-words text-destructive">{effect.lastError}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
