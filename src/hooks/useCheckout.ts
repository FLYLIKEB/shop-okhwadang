'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { handleApiError } from '@/utils/error';
import { SESSION_KEYS } from '@/constants/storage';
import type { CartItem, PreparePaymentResponse } from '@/lib/api';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { Locale } from '@/i18n/routing';
import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import type { PaymentGatewayHandle } from '@/components/checkout/PaymentGateway';

export type PaymentStep = 'idle' | 'creating_order' | 'preparing_payment' | 'confirming_payment' | 'success';

export interface UseCheckoutOptions {
  checkoutItems: CartItem[];
  form: ShippingForm;
  grandTotal: number;
  locale: Locale;
  paymentRef: React.RefObject<PaymentGatewayHandle | null>;
  prepareResult: PreparePaymentResponse | null;
  currentOrderId: number | null;
  currentOrderNumber: string;
  setStep: (step: PaymentStep) => void;
  setPrepareResult: (result: PreparePaymentResponse | null) => void;
  setCurrentOrderId: (id: number | null) => void;
  setCurrentOrderNumber: (orderNumber: string) => void;
  refetch: () => Promise<void>;
}

export function useCheckout(options: UseCheckoutOptions) {
  const { locale, paymentRef, grandTotal, refetch, form, checkoutItems } = options;
  const router = useRouter();

  const handlePaymentError = useCallback((message: string) => {
    toast.error(message);
    options.setStep('idle');
    options.setPrepareResult(null);
  }, [options]);

  const handleStripeFlow = useCallback(async (): Promise<void> => {
    if (!options.prepareResult || !options.paymentRef.current) return;

    options.setStep('confirming_payment');
    try {
      await options.paymentRef.current.confirm();
    } catch (err) {
      handlePaymentError(handleApiError(err, '결제에 실패했습니다.'));
    }
  }, [options, handlePaymentError]);

  const handleTossFlow = useCallback(async (orderId: number, orderNumber: string, result: PreparePaymentResponse): Promise<void> => {
    options.setCurrentOrderId(orderId);
    options.setCurrentOrderNumber(orderNumber);
    options.setPrepareResult(result);
    // PaymentGateway renders after state update; give it a tick before calling confirm
    setTimeout(async () => {
      await options.paymentRef.current?.confirm();
    }, 100);
  }, [options]);

  const handleMockFlow = useCallback(async (orderId: number, orderNumber: string): Promise<void> => {
    options.setStep('confirming_payment');
    await paymentsApi.confirm(
      { orderId, paymentKey: `mock-${orderNumber}`, amount: grandTotal },
    );

    options.setStep('success');
    toast.success('결제가 완료되었습니다.');
    sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
    await refetch();
    router.replace(`/${locale}/order/complete?orderId=${orderId}&orderNumber=${orderNumber}`);
  }, [grandTotal, locale, refetch, router, options]);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // If already prepared (Stripe), trigger stripe confirm
    if (options.prepareResult && options.prepareResult.gateway === 'stripe') {
      await handleStripeFlow();
      return;
    }

    const errors: FormErrors = {};
    if (form.recipientName.trim().length < 2) {
      errors.recipientName = '이름은 2자 이상 입력해주세요.';
    }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(form.recipientPhone)) {
      errors.recipientPhone = '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)';
    }
    if (!/^\d{5}$/.test(form.zipcode)) {
      errors.zipcode = '우편번호는 5자리 숫자로 입력해주세요.';
    }
    if (form.address.trim().length === 0) {
      errors.address = '주소를 입력해주세요.';
    }
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      options.setStep('creating_order');
      const order = await ordersApi.create(
        {
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            productOptionId: item.productOptionId,
            quantity: item.quantity,
          })),
          recipientName: form.recipientName.trim(),
          recipientPhone: form.recipientPhone.trim(),
          zipcode: form.zipcode.trim(),
          address: form.address.trim(),
          addressDetail: form.addressDetail.trim() || null,
          memo: form.memo.trim() || null,
        },
      );

      options.setStep('preparing_payment');
      const result: PreparePaymentResponse = await paymentsApi.prepare(
        { orderId: order.id, locale },
      );

      // Toss flow
      const isToss =
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
        toast.info('카드 정보를 입력하고 결제하기를 눌러주세요.');
        return;
      }

      // Mock flow
      await handleMockFlow(order.id, order.orderNumber);
    } catch (err) {
      toast.error(handleApiError(err, '결제 중 오류가 발생했습니다.'));
      options.setStep('idle');
    }
  }, [options, form, checkoutItems, locale, handleStripeFlow, handleTossFlow, handleMockFlow]);

  return {
    handleSubmit,
    handlePaymentError,
  };
}