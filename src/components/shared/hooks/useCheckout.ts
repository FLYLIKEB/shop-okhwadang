'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { SESSION_KEYS } from '@/constants/storage';
import type { CartItem, CheckoutGatewayName, PreparePaymentResponse } from '@/lib/api';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { Locale } from '@/i18n/routing';
import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import type { PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import { toastMessage } from '@/utils/toastMessages';

export type PaymentStep = 'idle' | 'creating_order' | 'preparing_payment' | 'confirming_payment' | 'success';

export interface UseCheckoutOptions {
  checkoutItems: CartItem[];
  form: ShippingForm;
  grandTotal: number;
  locale: Locale;
  paymentRef: React.RefObject<PaymentGatewayHandle | null>;
  prepareResult: PreparePaymentResponse | null;
  selectedGateway: CheckoutGatewayName;
  currentOrderId: number | null;
  currentOrderNumber: string;
  requiredConsent?: boolean;
  marketingConsent?: boolean;
  selectedUserCouponId?: number;
  pointsUsed?: number;
  setErrors: (errors: FormErrors) => void;
  setStep: (step: PaymentStep) => void;
  setPrepareResult: (result: PreparePaymentResponse | null) => void;
  setCurrentOrderId: (id: number | null) => void;
  setCurrentOrderNumber: (orderNumber: string) => void;
  setConfirmedGrandTotal: (amount: number | null) => void;
  refetch: () => Promise<void>;
}

function normalizeTextValue(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeZipcodeValue(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return String(value).padStart(5, '0');
  }
  return normalizeTextValue(value);
}

export function useCheckout(options: UseCheckoutOptions) {
  const { locale, grandTotal, refetch, form, checkoutItems } = options;
  const router = useRouter();

  const handlePaymentError = useCallback((message: string) => {
    toast.error(message);
    options.setStep('idle');
    options.setPrepareResult(null);
  }, [options]);

  const handlePreparedGatewayFlow = useCallback(async (): Promise<void> => {
    if (!options.prepareResult || !options.paymentRef.current) return;

    options.setStep('confirming_payment');
    try {
      await options.paymentRef.current.confirm();
    } catch (err) {
      handlePaymentError(handleApiError(err, locale === 'en' ? 'Payment failed.' : '결제에 실패했습니다.'));
    }
  }, [options, handlePaymentError, locale]);

  const handleTossFlow = useCallback(async (orderId: number, orderNumber: string, result: PreparePaymentResponse): Promise<void> => {
    options.setCurrentOrderId(orderId);
    options.setCurrentOrderNumber(orderNumber);
    options.setPrepareResult(result);
    // PaymentGateway renders after state update; give it a tick before calling confirm
    setTimeout(async () => {
      await options.paymentRef.current?.confirm();
    }, 100);
  }, [options]);

  const handleExternalRedirectFlow = useCallback(async (orderId: number, orderNumber: string, result: PreparePaymentResponse): Promise<void> => {
    options.setCurrentOrderId(orderId);
    options.setCurrentOrderNumber(orderNumber);
    options.setPrepareResult(result);
    options.setStep('confirming_payment');

    // PaymentGateway renders after state update; give it a tick before invoking the redirect/open gateway.
    setTimeout(async () => {
      const gateway = options.paymentRef.current;
      if (!gateway) {
        options.setStep('idle');
        toast.info(toastMessage('paymentMethodPrompt'));
        return;
      }

      try {
        await gateway.confirm();
      } catch (err) {
        handlePaymentError(handleApiError(err, locale === 'en' ? 'Payment failed.' : '결제에 실패했습니다.'));
      }
    }, 100);
  }, [options, handlePaymentError, locale]);

  const handleMockFlow = useCallback(async (orderId: number, orderNumber: string): Promise<void> => {
    options.setStep('confirming_payment');
    await paymentsApi.confirm(
      { orderId, paymentKey: `mock-${orderNumber}`, amount: grandTotal },
    );

    options.setStep('success');
    toast.success(toastMessage('paymentComplete'));
    sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
    await refetch();
    router.replace(`/${locale}/order/complete?orderId=${orderId}&orderNumber=${orderNumber}`);
  }, [grandTotal, locale, refetch, router, options]);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (options.requiredConsent === false) {
      toast.error(toastMessage('checkoutConsentRequired'));
      return;
    }

    const recipientName = normalizeTextValue(form.recipientName);
    const recipientPhone = normalizeTextValue(form.recipientPhone);
    const zipcode = normalizeZipcodeValue(form.zipcode);
    const address = normalizeTextValue(form.address);
    const addressDetail = normalizeTextValue(form.addressDetail);
    const memo = normalizeTextValue(form.memo);

    // If already prepared for a user-action gateway, trigger its confirm/redirect step.
    if (
      options.prepareResult
      && ['stripe', 'paypal', 'naverpay'].includes(options.prepareResult.gateway)
    ) {
      await handlePreparedGatewayFlow();
      return;
    }

    const errors: FormErrors = {};
    if (recipientName.length < 2) {
      errors.recipientName = locale === 'en' ? 'Please enter at least 2 characters for the name.' : '이름은 2자 이상 입력해주세요.';
    }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(recipientPhone)) {
      errors.recipientPhone = locale === 'en' ? 'Please enter a valid phone number. (e.g. 010-1234-5678)' : '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)';
    }
    if (!/^\d{5}$/.test(zipcode)) {
      errors.zipcode = locale === 'en' ? 'ZIP code must be 5 digits.' : '우편번호는 5자리 숫자로 입력해주세요.';
    }
    if (address.length === 0) {
      errors.address = locale === 'en' ? 'Please enter your address.' : '주소를 입력해주세요.';
    }
    if (Object.keys(errors).length > 0) {
      options.setErrors(errors);
      toast.error(toastMessage('checkoutValidationError'));
      return;
    }

    options.setErrors({});

    try {
      options.setStep('creating_order');
      const order = await ordersApi.create(
        {
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            productOptionId: item.productOptionId,
            quantity: item.quantity,
          })),
          recipientName,
          recipientPhone,
          zipcode,
          address,
          addressDetail: addressDetail || null,
          memo: memo || null,
          marketingConsent: options.marketingConsent ?? false,
          userCouponId: options.selectedUserCouponId,
          pointsUsed: options.pointsUsed && options.pointsUsed > 0 ? options.pointsUsed : undefined,
        },
      );

      const confirmedTotal = Number(order.totalAmount);
      options.setConfirmedGrandTotal(confirmedTotal);

      options.setStep('preparing_payment');
      const result: PreparePaymentResponse = await paymentsApi.prepare(
        { orderId: order.id, locale, gateway: options.selectedGateway },
      );

      // Toss flow
      const isToss =
        result.gateway === 'toss' &&
        locale === 'ko' &&
        result.clientKey &&
        result.clientKey !== 'mock_client_key';

      if (isToss) {
        await handleTossFlow(order.id, order.orderNumber, result);
        return;
      }

      // Stripe flow: render Payment Element
      const isStripe =
        result.gateway === 'stripe' &&
        result.clientKey &&
        result.clientKey !== 'mock_client_key';

      if (isStripe) {
        options.setCurrentOrderId(order.id);
        options.setCurrentOrderNumber(order.orderNumber);
        options.setPrepareResult(result);
        options.setStep('idle');
        toast.info(toastMessage('cardPaymentPrompt'));
        return;
      }

      if (result.gateway === 'paypal' || result.gateway === 'naverpay') {
        await handleExternalRedirectFlow(order.id, order.orderNumber, result);
        return;
      }

      // Mock flow
      await handleMockFlow(order.id, order.orderNumber);
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('paymentError')));
      options.setStep('idle');
    }
  }, [options, form, checkoutItems, locale, handlePreparedGatewayFlow, handleTossFlow, handleExternalRedirectFlow, handleMockFlow]);

  return {
    handleSubmit,
    handlePaymentError,
  };
}
