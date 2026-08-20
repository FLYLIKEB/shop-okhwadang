'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { CheckoutGatewayName, OrderResponse, OrderServiceRequest, OrderServiceRequestType, PreparePaymentResponse } from '@/lib/api';
import { formatCurrency, type Locale as CurrencyLocale } from '@/utils/currency';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import ShippingTimeline from '@/components/shared/ShippingTimeline';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import type { PaymentStep } from '@/components/shared/hooks/useCheckout';
import { handleApiError } from '@/utils/error';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/routing';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';
import { toastMessage } from '@/utils/toastMessages';

const STATUS_TIMELINE = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const params = useParams();
  const locale = useLocale() as CurrencyLocale;
  const tOrder = useTranslations('order');
  const tMy = useTranslations('myPage');
  const t = useTranslations('orderDetail');
  const tCheckout = useTranslations('checkout');
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const checkoutLocale: Locale = locale === 'en' ? 'en' : 'ko';
  const [selectedGateway, setSelectedGateway] = useState<CheckoutGatewayName>(
    () => getDefaultCheckoutGateway(checkoutLocale),
  );
  const [prepareResult, setPrepareResult] = useState<PreparePaymentResponse | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [serviceRequests, setServiceRequests] = useState<OrderServiceRequest[]>([]);
  const [requestType, setRequestType] = useState<OrderServiceRequestType>('cancel');
  const [requestReason, setRequestReason] = useState('');
  const [requestDetail, setRequestDetail] = useState('');
  const paymentRef = useRef<PaymentGatewayHandle>(null);

  const { execute: loadOrder, isLoading: loading } = useAsyncAction(
    async () => {
      const id = Number(params.id);
      if (isNaN(id)) {
        setNotFound(true);
        return;
      }
      const res = await ordersApi.getById(id, { params: { locale } });
      setOrder(res);
      if (typeof ordersApi.getServiceRequests === 'function') {
        const requests = await ordersApi.getServiceRequests(id);
        setServiceRequests(requests);
      }
    },
    { onError: () => setNotFound(true) },
  );

  useEffect(() => {
    setSelectedGateway(getDefaultCheckoutGateway(checkoutLocale));
    setPrepareResult(null);
    setPaymentStep('idle');
  }, [checkoutLocale]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, locale, params.id]);

  useEffect(() => {
    if (!order) return;
    if (['pending', 'paid'].includes(order.status)) {
      setRequestType('cancel');
      return;
    }
    if (['delivered', 'completed'].includes(order.status) && requestType === 'cancel') {
      setRequestType('return');
    }
  }, [order, requestType]);

  if (isLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Link href="/my/orders" className="mt-4 inline-block text-sm hover:underline">
          {t('backToOrders')}
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUS_TIMELINE.indexOf(order.status);
  const gatewayOptions: CheckoutGatewayName[] = getGatewayOptionsByLocale(checkoutLocale);
  const stepLabels: Record<PaymentStep, string> = {
    idle: tCheckout('steps.idle'),
    creating_order: tCheckout('steps.creating_order'),
    preparing_payment: tCheckout('steps.preparing_payment'),
    confirming_payment: tCheckout('steps.confirming_payment'),
    success: tCheckout('steps.success'),
  };
  const isPaymentPending = order.status === 'pending';
  const shouldShowShippingTracking = !['pending', 'cancelled', 'refunded'].includes(order.status);
  const payableAmount = Number(order.totalAmount);
  const isImmediatePendingCancel = order.status === 'pending' && requestType === 'cancel';
  const canCancel = ['pending', 'paid'].includes(order.status);
  const canAfterDeliveryRequest = ['delivered', 'completed'].includes(order.status);
  const requestTypeLabels: Record<OrderServiceRequestType, string> = {
    cancel: t('serviceRequests.types.cancel'),
    return: t('serviceRequests.types.return'),
    exchange: t('serviceRequests.types.exchange'),
    refund: t('serviceRequests.types.refund'),
  };
  const requestStatusLabels: Record<string, string> = {
    requested: t('serviceRequests.status.requested'),
    approved: t('serviceRequests.status.approved'),
    rejected: t('serviceRequests.status.rejected'),
    completed: t('serviceRequests.status.completed'),
  };

  const handlePaymentError = (message: string) => {
    toast.error(message);
    setPaymentStep('idle');
  };

  const submitServiceRequest = async () => {
    if (!requestReason.trim()) {
      toast.error(t('serviceRequests.reasonRequired'));
      return;
    }

    try {
      await ordersApi.createServiceRequest(order.id, {
        type: requestType,
        reason: requestReason.trim(),
        detail: requestDetail.trim() || undefined,
        useShippingAddress: true,
      });
      toast.success(
        isImmediatePendingCancel ? t('serviceRequests.immediateCancelSuccess') : t('serviceRequests.submitSuccess'),
      );
      setRequestReason('');
      setRequestDetail('');
      const requests = await ordersApi.getServiceRequests(order.id);
      setServiceRequests(requests);
      void loadOrder();
    } catch (err) {
      toast.error(handleApiError(err, t('serviceRequests.submitError')));
    }
  };

  const handlePendingPayment = async () => {
    if (!isPaymentPending) return;

    if (prepareResult && paymentRef.current) {
      setPaymentStep('confirming_payment');
      try {
        await paymentRef.current.confirm();
      } catch (err) {
        toast.error(handleApiError(err, toastMessage('paymentError')));
        setPaymentStep('idle');
      }
      return;
    }

    setPaymentStep('preparing_payment');
    try {
      const result = await paymentsApi.prepare({
        orderId: order.id,
        locale: checkoutLocale,
        gateway: selectedGateway,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      if (result.gateway === 'bank_transfer') {
        setPrepareResult(null);
        setPaymentStep('idle');
        toast.success(toastMessage('bankTransferOrderReceived'));
        void loadOrder();
        return;
      }

      setPrepareResult(result);
      setPaymentStep('idle');
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('paymentError')));
      setPaymentStep('idle');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          {tMy('title')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link href="/my/orders" className="text-sm text-muted-foreground hover:underline">
          {tOrder('orderHistory')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{order.orderNumber}</h1>
      </div>

      <div className="space-y-6">
        {/* Status timeline */}
        {!['cancelled', 'refunded'].includes(order.status) && (
          <section className="surface-card p-6">
            <h2 className="mb-4 text-base font-semibold">{t('shippingStatus')}</h2>
            <div className="flex items-center justify-between">
              {STATUS_TIMELINE.map((status, index) => (
                <div key={status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        index <= currentStatusIndex
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs text-center whitespace-nowrap">
                      {tOrder.has(`status.${status}`) ? tOrder(`status.${status}`) : status}
                    </span>
                  </div>
                  {index < STATUS_TIMELINE.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 ${
                        index < currentStatusIndex ? 'bg-foreground' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shipping tracking */}
        {shouldShowShippingTracking && (
          <ShippingTimeline orderId={Number(params.id)} />
        )}

        {/* Pending payment */}
        {isPaymentPending && (
          <section className="surface-card p-6">
            <h2 className="mb-4 text-base font-semibold">{tCheckout('paymentMethod')}</h2>
            {prepareResult ? (
              <PaymentGateway
                ref={paymentRef}
                prepareResult={prepareResult}
                orderId={order.id}
                orderNumber={order.orderNumber}
                amount={payableAmount}
                locale={checkoutLocale}
                onError={handlePaymentError}
              />
            ) : (
              <PaymentMethodSelector
                gatewayOptions={gatewayOptions}
                selectedGateway={selectedGateway}
                onSelect={setSelectedGateway}
              />
            )}
            <Button
              type="button"
              disabled={paymentStep !== 'idle'}
              className="mt-4 w-full md:w-auto"
              onClick={handlePendingPayment}
            >
              {stepLabels[paymentStep]}
            </Button>
          </section>
        )}

        {/* Order items */}
        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold">{t('orderItems')}</h2>
          <ul className="divide-y divide-soft">
            {order.items.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.optionName && (
                      <p className="text-xs text-muted-foreground">{item.optionName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price, locale)} × {t('quantity', { count: item.quantity })}
                    </p>
                  </div>
                  <p className="font-medium shrink-0">
                    {formatCurrency(Number(item.price) * item.quantity, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order amounts */}
        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold">{t('paymentSummary')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('productAmount')}</dt>
              <dd>{formatCurrency(order.totalAmount, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('discountAmount')}</dt>
              <dd>-{formatCurrency(order.discountAmount, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('shippingFee')}</dt>
              <dd>
                {Number(order.shippingFee) === 0
                  ? t('freeShipping')
                  : formatCurrency(order.shippingFee, locale)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-soft pt-2 font-bold">
              <dt>{t('total')}</dt>
              <dd>
                {formatCurrency(
                  Number(order.totalAmount) -
                  Number(order.discountAmount) +
                  Number(order.shippingFee),
                  locale,
                )}
              </dd>
            </div>
          </dl>
        </section>


        {/* Cancellation / return / exchange / refund requests */}
        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold">{t('serviceRequests.title')}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {order.status === 'pending'
              ? t('serviceRequests.pendingCancelGuide')
              : canCancel
                ? t('serviceRequests.cancelGuide')
                : canAfterDeliveryRequest
                  ? t('serviceRequests.afterDeliveryGuide')
                  : t('serviceRequests.unavailableGuide')}
          </p>

          {(canCancel || canAfterDeliveryRequest) && (
            <div className="space-y-3 rounded-md bg-muted/30 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{t('serviceRequests.typeLabel')}</span>
                  <select
                    value={requestType}
                    onChange={(event) => setRequestType(event.target.value as OrderServiceRequestType)}
                    className="w-full rounded-md border field-soft px-3 py-2 text-sm"
                  >
                    {canCancel && <option value="cancel">{requestTypeLabels.cancel}</option>}
                    {canAfterDeliveryRequest && <option value="return">{requestTypeLabels.return}</option>}
                    {canAfterDeliveryRequest && <option value="exchange">{requestTypeLabels.exchange}</option>}
                    {canAfterDeliveryRequest && <option value="refund">{requestTypeLabels.refund}</option>}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">{t('serviceRequests.reasonLabel')}</span>
                  <input
                    value={requestReason}
                    onChange={(event) => setRequestReason(event.target.value)}
                    maxLength={100}
                    className="w-full rounded-md border field-soft px-3 py-2 text-sm"
                    placeholder={t('serviceRequests.reasonPlaceholder')}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">{t('serviceRequests.detailLabel')}</span>
                <textarea
                  value={requestDetail}
                  onChange={(event) => setRequestDetail(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border field-soft px-3 py-2 text-sm"
                  placeholder={t('serviceRequests.detailPlaceholder')}
                />
              </label>
              <Button
                type="button"
                onClick={submitServiceRequest}
                className={requestType === 'cancel' ? 'toss-account__cancel-action' : undefined}
              >
                {isImmediatePendingCancel ? t('serviceRequests.immediateCancelSubmit') : t('serviceRequests.submit')}
              </Button>
            </div>
          )}

          {serviceRequests.length > 0 && (
            <ul className="mt-4 space-y-2">
              {serviceRequests.map((request) => (
                <li key={request.id} className="rounded-md border border-soft bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{requestTypeLabels[request.type]}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{requestStatusLabels[request.status] ?? request.status}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{request.reason}</p>
                  {request.adminNote && <p className="mt-2 text-xs text-muted-foreground">{request.adminNote}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tax receipt / invoice guide */}
        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold">{t('taxReceiptGuideTitle')}</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{t('taxReceiptGuideDescription')}</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>{t('taxReceiptPersonal')}</li>
              <li>{t('taxInvoiceBusiness')}</li>
            </ul>
          </div>
        </section>

        {/* Shipping address */}
        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold">{t('shippingAddress')}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('recipient')}</dt>
              <dd>{order.recipientName}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('phone')}</dt>
              <dd>{order.recipientPhone}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('address')}</dt>
              <dd>
                [{order.zipcode}] {order.address}
                {order.addressDetail && `, ${order.addressDetail}`}
              </dd>
            </div>
            {order.memo && (
              <div className="flex gap-4">
                <dt className="w-20 shrink-0 text-muted-foreground">{t('deliveryMemo')}</dt>
                <dd>{order.memo}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
