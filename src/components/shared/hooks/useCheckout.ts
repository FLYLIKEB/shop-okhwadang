'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { SESSION_KEYS } from '@/constants/storage';
import type {
  CartItem,
  CheckoutGatewayName,
  GuestConfirmPaymentResponse,
  PreparePaymentResponse,
} from '@/lib/api';
import { guestOrdersApi, guestPaymentsApi, ordersApi, paymentsApi } from '@/lib/api';


import type { Locale } from '@/i18n/routing';
import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';
import type { PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import { localMessage } from '@/utils/localMessages';
import { toastMessage } from '@/utils/toastMessages';

export type PaymentStep =
  | 'idle'
  | 'creating_order'
  | 'preparing_payment'
  | 'confirming_payment'
  | 'success';

export interface UseCheckoutOptions {
  checkoutItems: CartItem[];
  form: ShippingForm;
  guestEmail: string;
  grandTotal: number;
  locale: Locale;
  paymentRef: React.RefObject<PaymentGatewayHandle | null>;
  prepareResult: PreparePaymentResponse | null;
  selectedGateway: CheckoutGatewayName;
  currentOrderId: number | null;
  currentOrderNumber: string;
  currentGuestAccessToken: string;
  requiredConsent?: boolean;
  marketingConsent?: boolean;
  appliedUserCouponId?: number;
  appliedPointsUsed?: number;
  isGuestCheckout: boolean;
  setErrors: (errors: FormErrors) => void;
  setStep: (step: PaymentStep) => void;
  setPrepareResult: (result: PreparePaymentResponse | null) => void;
  setCurrentOrderId: (id: number | null) => void;
  setCurrentOrderNumber: (orderNumber: string) => void;
  setCurrentGuestAccessToken: (guestAccessToken: string) => void;
  setCurrentGuestAccessTokenExpiresAt: (guestAccessTokenExpiresAt: string) => void;
  setConfirmedGrandTotal: (amount: number | null) => void;
  refetch: () => Promise<void>;
}

interface GuestOrderContext {
  orderId: number;
  orderNumber: string;
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
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

function clearHostedProviderContexts(): void {
  sessionStorage.removeItem(SESSION_KEYS.TOSS_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.PAYPAL_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.NAVERPAY_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.EXIMBAY_CONTEXT);
}

function persistGuestOrderContext(context: GuestOrderContext): void {
  sessionStorage.setItem(SESSION_KEYS.GUEST_ORDER_CONTEXT, JSON.stringify(context));
}


export function useCheckout(options: UseCheckoutOptions) {
  const { locale, grandTotal, refetch, form, checkoutItems } = options;
  const router = useRouter();

  const handlePaymentError = useCallback(
    (message: string) => {
      toast.error(message);
      options.setStep('idle');
      options.setPrepareResult(null);
    },
    [options],
  );

  const handlePreparedGatewayFlow = useCallback(async (): Promise<void> => {
    if (!options.prepareResult || !options.paymentRef.current) return;

    options.setStep('confirming_payment');
    try {
      await options.paymentRef.current.confirm();
    } catch (err) {
      handlePaymentError(
        handleApiError(err, localMessage('checkout.paymentError', undefined, locale)),
      );
    }
  }, [options, handlePaymentError, locale]);

  const handleTossFlow = useCallback(
    async (orderId: number, orderNumber: string, result: PreparePaymentResponse): Promise<void> => {
      options.setCurrentOrderId(orderId);
      options.setCurrentOrderNumber(orderNumber);
      options.setPrepareResult(result);
      options.setStep('idle');
      toast.info(toastMessage('paymentMethodPrompt'));
    },
    [options],
  );

  const handleExternalRedirectFlow = useCallback(
    async (orderId: number, orderNumber: string, result: PreparePaymentResponse): Promise<void> => {
      options.setCurrentOrderId(orderId);
      options.setCurrentOrderNumber(orderNumber);
      options.setPrepareResult(result);
      options.setStep('confirming_payment');

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
          handlePaymentError(
            handleApiError(err, localMessage('checkout.paymentError', undefined, locale)),
          );
        }
      }, 100);
    },
    [options, handlePaymentError, locale],
  );

  const handleMockFlow = useCallback(
    async (
      orderId: number,
      orderNumber: string,
      amountToConfirm: number,
      guestAccessToken?: string,
    ): Promise<void> => {
      options.setStep('confirming_payment');

      if (options.isGuestCheckout) {
        if (!guestAccessToken) {
          throw new Error('guest_access_token_missing');
        }
        const result: GuestConfirmPaymentResponse = await guestPaymentsApi.confirm(
          orderId,
          { paymentKey: `mock-${orderNumber}`, amount: amountToConfirm },
          guestAccessToken,
        );
        const guestContext = {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          guestAccessToken: result.guestAccessToken,
          guestAccessTokenExpiresAt: result.guestAccessTokenExpiresAt,
        };
        persistGuestOrderContext(guestContext);
        clearHostedProviderContexts();
        options.setStep('success');
        toast.success(toastMessage('paymentComplete'));
        sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
        await refetch();
        router.replace(
          `/${locale}/order/complete?orderId=${result.orderId}&orderNumber=${result.orderNumber}&flow=guest`,
        );
        return;
      }

      await paymentsApi.confirm({ orderId, paymentKey: `mock-${orderNumber}`, amount: amountToConfirm });
      clearHostedProviderContexts();
      options.setStep('success');
      toast.success(toastMessage('paymentComplete'));
      sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
      await refetch();
      router.replace(`/${locale}/order/complete?orderId=${orderId}&orderNumber=${orderNumber}`);
    },
    [locale, refetch, router, options],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
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
      const normalizedGuestEmail = normalizeTextValue(options.guestEmail).toLowerCase();

      if (
        options.prepareResult &&
        ['toss', 'stripe', 'paypal', 'naverpay', 'eximbay'].includes(options.prepareResult.gateway)
      ) {
        await handlePreparedGatewayFlow();
        return;
      }

      const errors: FormErrors = {};
      if (options.isGuestCheckout && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedGuestEmail)) {
        errors.guestEmail = localMessage('checkout.validation.guestEmailInvalid', undefined, locale);
      }
      if (recipientName.length < 2) {
        errors.recipientName = localMessage('checkout.validation.recipientNameTooShort', undefined, locale);
      }
      if (!/^\d{3}-\d{3,4}-\d{4}$/.test(recipientPhone)) {
        errors.recipientPhone = localMessage('checkout.validation.phoneInvalid', undefined, locale);
      }
      if (!/^\d{5}$/.test(zipcode)) {
        errors.zipcode = localMessage('checkout.validation.zipcodeInvalid', undefined, locale);
      }
      if (address.length === 0) {
        errors.address = localMessage('checkout.validation.addressRequired', undefined, locale);
      }
      if (Object.keys(errors).length > 0) {
        options.setErrors(errors);
        toast.error(toastMessage('checkoutValidationError'));
        return;
      }

      options.setErrors({});

      try {
        options.setStep('creating_order');

        let orderId: number;
        let orderNumber: string;
        let guestAccessToken = '';
        let guestAccessTokenExpiresAt = '';
        let confirmedTotal = grandTotal;

        if (options.isGuestCheckout) {
          const result = await guestOrdersApi.create({
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
            guestEmail: normalizedGuestEmail,
            orderLocale: locale,
            marketingConsent: options.marketingConsent ?? false,
          });



          orderId = result.order.id;
          orderNumber = result.order.orderNumber;
          guestAccessToken = result.guestAccessToken;
          guestAccessTokenExpiresAt = result.guestAccessTokenExpiresAt;
          confirmedTotal = Number(result.order.totalAmount);
          options.setCurrentGuestAccessToken(result.guestAccessToken);
          options.setCurrentGuestAccessTokenExpiresAt(result.guestAccessTokenExpiresAt);
        } else {
          const order = await ordersApi.create({
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
            orderLocale: locale,
            marketingConsent: options.marketingConsent ?? false,
            userCouponId: options.appliedUserCouponId,
            pointsUsed: options.appliedPointsUsed && options.appliedPointsUsed > 0 ? options.appliedPointsUsed : undefined,
          });

          orderId = order.id;
          confirmedTotal = Number(order.totalAmount);
          orderNumber = order.orderNumber;
          options.setCurrentGuestAccessToken('');
          options.setCurrentGuestAccessTokenExpiresAt('');
        }

        options.setConfirmedGrandTotal(confirmedTotal);
        options.setStep('preparing_payment');

        const result: PreparePaymentResponse = options.isGuestCheckout
          ? await guestPaymentsApi.prepare(
              orderId,
              { locale, gateway: options.selectedGateway },
              guestAccessToken,
            )
          : await paymentsApi.prepare({ orderId, locale, gateway: options.selectedGateway });

        const isToss =
          result.gateway === 'toss' &&
          locale === 'ko' &&
          result.clientKey &&
          result.clientKey !== 'mock_client_key';

        if (isToss) {
          await handleTossFlow(orderId, orderNumber, result);
          return;
        }

        const isStripe =
          result.gateway === 'stripe' &&
          result.clientKey &&
          result.clientKey !== 'mock_client_key';

        if (isStripe) {
          options.setCurrentOrderId(orderId);
          options.setCurrentOrderNumber(orderNumber);
          options.setPrepareResult(result);
          options.setStep('idle');
          toast.info(toastMessage('cardPaymentPrompt'));
          return;
        }

        if (
          result.gateway === 'paypal' ||
          result.gateway === 'naverpay' ||
          result.gateway === 'eximbay'
        ) {
          await handleExternalRedirectFlow(orderId, orderNumber, result);
          return;
        }

        if (result.gateway === 'bank_transfer') {
          options.setCurrentOrderId(orderId);
          options.setCurrentOrderNumber(orderNumber);
          options.setPrepareResult(null);
          clearHostedProviderContexts();
          options.setStep('success');
          toast.success(toastMessage('bankTransferOrderReceived'));
          sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);

          if (options.isGuestCheckout) {
            persistGuestOrderContext({
              orderId,
              orderNumber,
              guestAccessToken,
              guestAccessTokenExpiresAt,
            });
            await refetch();
            router.replace(
              `/${locale}/order/complete?orderId=${orderId}&orderNumber=${orderNumber}&payment=bank_transfer&flow=guest`,
            );
            return;
          }

          await refetch();
          router.replace(
            `/${locale}/order/complete?orderId=${orderId}&orderNumber=${orderNumber}&payment=bank_transfer`,
          );
          return;
        }

        await handleMockFlow(orderId, orderNumber, confirmedTotal, guestAccessToken || undefined);
      } catch (err) {
        toast.error(handleApiError(err, toastMessage('paymentError')));
        options.setStep('idle');
      }
    },
    [
      options,
      form,
      checkoutItems,
      locale,
      grandTotal,
      refetch,
      router,
      handlePreparedGatewayFlow,
      handleTossFlow,
      handleExternalRedirectFlow,
      handleMockFlow,
    ],
  );

  return {
    handleSubmit,
    handlePaymentError,
  };
}
