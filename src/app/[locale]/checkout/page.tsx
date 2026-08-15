'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type {
  CartItem,
  CheckoutGatewayName,
  PreparePaymentResponse,
  UserAddress,
} from '@/lib/api';
import { usersApi } from '@/lib/api';
import { SESSION_KEYS } from '@/constants/storage';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';
import type { Locale } from '@/i18n/routing';
import PaymentGateway, {
  TossPaymentWidgetPreview,
  type PaymentGatewayHandle,
} from '@/components/shared/checkout/PaymentGateway';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import { AddressSelectorSection } from '@/components/shared/checkout/AddressSelectorSection';
import { OrderSummarySection } from '@/components/shared/checkout/OrderSummarySection';
import CouponSelector from '@/components/shared/checkout/CouponSelector';
import {
  AddressDetailInputSection,
  AddressInputSection,
  MemoInputSection,
  PhoneInputSection,
  ShippingFormSection,
  ZipcodeInputSection,
} from '@/components/shared/checkout/ShippingFormSection';
import { useCheckout, type PaymentStep } from '@/components/shared/hooks/useCheckout';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { formatCurrency } from '@/utils/currency';
import {
  checkoutPricingApi,
  type CheckoutPricingPreviewResponse,
} from '@/lib/api/checkout-pricing';

export interface ShippingForm {
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string;
}

export interface FormErrors {
  recipientName?: string;
  recipientPhone?: string;
  zipcode?: string;
  address?: string;
  guestEmail?: string;
}

function normalizeInputValue(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function normalizeZipcodeInputValue(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return String(value).padStart(5, '0');
  }
  return normalizeInputValue(value);
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('checkout');
  const router = useRouter();
  const { isVisible: isNavVisible } = useMobileNav();
  const { isAuthenticated, isLoading } = useAuth();
  const { refetch } = useCart();

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [step, setStep] = useState<PaymentStep>('idle');
  const [prepareResult, setPrepareResult] = useState<PreparePaymentResponse | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<CheckoutGatewayName>(() =>
    getDefaultCheckoutGateway(locale),
  );
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [currentGuestAccessToken, setCurrentGuestAccessToken] = useState('');
  const [currentGuestAccessTokenExpiresAt, setCurrentGuestAccessTokenExpiresAt] = useState('');
  const [confirmedGrandTotal, setConfirmedGrandTotal] = useState<number | null>(null);
  const [pricingPreview, setPricingPreview] = useState<CheckoutPricingPreviewResponse | null>(null);
  const [form, setForm] = useState<ShippingForm>({
    recipientName: '',
    recipientPhone: '',
    zipcode: '',
    address: '',
    addressDetail: '',
    memo: '',
  });
  const [guestEmail, setGuestEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [requiredConsent, setRequiredConsent] = useState(false);
  const [requestedUserCouponId, setRequestedUserCouponId] = useState<number | undefined>();
  const [requestedPointsToUse, setRequestedPointsToUse] = useState(0);
  const paymentRef = useRef<PaymentGatewayHandle>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'manual' | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const isGuestCheckout = !isAuthenticated;
  const totalAmount = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
  const couponDiscount = pricingPreview?.couponDiscount ?? 0;
  const appliedPointsUsed = pricingPreview?.appliedPointsUsed ?? 0;
  const shippingFee = pricingPreview?.shippingFee ?? 0;
  const freeShippingThreshold = pricingPreview?.freeShippingThreshold ?? 0;
  const grandTotal = confirmedGrandTotal ?? pricingPreview?.totalPayable ?? totalAmount;
  const isPricingReady = confirmedGrandTotal !== null || pricingPreview !== null;

  const stepLabels: Record<PaymentStep, string> = {
    idle: t('steps.idle'),
    creating_order: t('steps.creating_order'),
    preparing_payment: t('steps.preparing_payment'),
    confirming_payment: t('steps.confirming_payment'),
    success: t('steps.success'),
  };
  const loadAddressErrorMessage = t('loadAddressError');
  const gatewayOptions = getGatewayOptionsByLocale(locale);
  const { execute: previewPricing, isLoading: pricingPreviewLoading } = useAsyncAction(
    async ({
      zipcode,
      userCouponId,
      pointsToUse,
      locale: quoteLocale,
    }: {
      zipcode: string;
      userCouponId?: number;
      pointsToUse?: number;
      locale: Locale;
    }) =>
      checkoutPricingApi.preview({
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          productOptionId: item.productOptionId,
          quantity: item.quantity,
        })),
        zipcode,
        userCouponId,
        pointsToUse,
        locale: quoteLocale,
      }),
    {
      onError: () => setPricingPreview(null),
      errorMessage: t('pricingPreviewError'),
    },
  );

  const fillFormFromAddress = (addr: UserAddress) => {
    setForm({
      recipientName: normalizeInputValue(addr.recipientName),
      recipientPhone: normalizeInputValue(addr.phone),
      zipcode: normalizeZipcodeInputValue(addr.zipcode),
      address: normalizeInputValue(addr.address),
      addressDetail: normalizeInputValue(addr.addressDetail),
      memo: '',
    });
  };

  useEffect(() => {
    setSelectedGateway(getDefaultCheckoutGateway(locale));
  }, [locale]);

  useEffect(() => {
    if (isLoading) return;

    setSessionChecked(false);
    const raw = sessionStorage.getItem(SESSION_KEYS.CHECKOUT_ITEMS);
    if (!raw) {
      router.replace(`/${locale}/cart`);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        router.replace(`/${locale}/cart`);
        return;
      }
      setCheckoutItems(parsed);
      setSessionChecked(true);
    } catch {
      router.replace(`/${locale}/cart`);
    }
  }, [isLoading, locale, router]);

  useEffect(() => {
    if (isGuestCheckout) {
      setRequestedUserCouponId(undefined);
      setRequestedPointsToUse(0);
    }
  }, [isGuestCheckout]);

  useEffect(() => {
    if (!sessionChecked || checkoutItems.length === 0) {
      setPricingPreview(null);
      return;
    }

    let active = true;
    const zipcode = /^\d{5}$/.test(form.zipcode.trim()) ? form.zipcode.trim() : '00000';

    void previewPricing({
      zipcode,
      userCouponId: isGuestCheckout ? undefined : requestedUserCouponId,
      pointsToUse: !isGuestCheckout && requestedPointsToUse > 0 ? requestedPointsToUse : undefined,
      locale,
    }).then((preview) => {
      if (active && preview) {
        setPricingPreview(preview);
      }
    });

    return () => {
      active = false;
    };
  }, [
    checkoutItems,
    form.zipcode,
    isGuestCheckout,
    locale,
    previewPricing,
    requestedPointsToUse,
    requestedUserCouponId,
    sessionChecked,
  ]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    setAddressLoading(true);
    usersApi
      .getAddresses()
      .then((result) => {
        setAddresses(result);
        const defaultAddr = result.find((a) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          fillFormFromAddress(defaultAddr);
        } else if (result.length > 0) {
          setSelectedAddressId(result[0].id);
          fillFormFromAddress(result[0]);
        }
      })
      .catch(() => {
        toast.error(loadAddressErrorMessage);
      })
      .finally(() => {
        setAddressLoading(false);
      });
  }, [isAuthenticated, isLoading, loadAddressErrorMessage]);

  const handleAddressSelect = (id: number | 'manual') => {
    setSelectedAddressId(id);
    if (id === 'manual') {
      setForm({ recipientName: '', recipientPhone: '', zipcode: '', address: '', addressDetail: '', memo: '' });
    } else {
      const addr = addresses.find((a) => a.id === id);
      if (addr) fillFormFromAddress(addr);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleGuestEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuestEmail(e.target.value);
    if (errors.guestEmail) {
      setErrors((prev) => ({ ...prev, guestEmail: undefined }));
    }
  };

  const { handleSubmit, handlePaymentError } = useCheckout({
    checkoutItems,
    form,
    guestEmail,
    grandTotal,
    locale,
    paymentRef,
    prepareResult,
    selectedGateway,
    currentOrderId,
    currentOrderNumber,
    currentGuestAccessToken,
    requiredConsent,
    appliedUserCouponId: pricingPreview?.appliedUserCouponId,
    appliedPointsUsed,
    isGuestCheckout,
    setStep,
    setPrepareResult,
    setCurrentOrderId,
    setCurrentOrderNumber,
    setCurrentGuestAccessToken,
    setCurrentGuestAccessTokenExpiresAt,
    setConfirmedGrandTotal,
    setErrors,
    refetch,
  });

  if (!sessionChecked || checkoutItems.length === 0) {
    return null;
  }

  return (
    <div className="layout-container layout-page pb-36 md:pb-8">
      <h1 className="typo-h1">{t('title')}</h1>

      <ol className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-soft bg-muted/20 px-3 py-2 text-xs text-muted-foreground md:max-w-xl">
        <li className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">{t('flow.shipping')}</li>
        <span aria-hidden>→</span>
        <li className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{t('flow.payment')}</li>
        <span aria-hidden>→</span>
        <li className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{t('flow.complete')}</li>
      </ol>

      <form id="checkout-form" onSubmit={handleSubmit} className="mt-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="layout-stack-md lg:col-span-2">
            <section className="surface-card p-6">
              <h2 className="typo-h3">{t('shippingInfo')}</h2>

              <div className="mt-4 layout-stack-md">
                {isGuestCheckout ? (
                  <div className="rounded-lg border border-soft bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold text-foreground">{t('guestCheckoutTitle')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('guestCheckoutDescription')}</p>
                    <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="guestEmail">
                      {t('guestEmailLabel')}
                    </label>
                    <input
                      id="guestEmail"
                      name="guestEmail"
                      type="email"
                      autoComplete="email"
                      value={guestEmail}
                      onChange={handleGuestEmailChange}
                      placeholder={t('guestEmailPlaceholder')}
                      className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                    {errors.guestEmail ? (
                      <p className="mt-2 text-sm text-destructive">{errors.guestEmail}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">{t('guestEmailDescription')}</p>
                    )}
                  </div>
                ) : (
                  <AddressSelectorSection
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    addressLoading={addressLoading}
                    onSelect={handleAddressSelect}
                    locale={locale}
                  />
                )}

                <ShippingFormSection form={form} errors={errors} onChange={handleChange} />
                <PhoneInputSection form={form} errors={errors} onChange={handleChange} />
                <ZipcodeInputSection form={form} errors={errors} onChange={handleChange} />
                <AddressInputSection form={form} errors={errors} onChange={handleChange} />
                <AddressDetailInputSection form={form} onChange={handleChange} />
                <MemoInputSection form={form} onChange={handleChange} />
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="typo-h3">{t('paymentMethod')}</h2>
              <div className="mt-4">
                {prepareResult ? (
                  <PaymentGateway
                    ref={paymentRef}
                    prepareResult={prepareResult}
                    orderId={currentOrderId!}
                    orderNumber={currentOrderNumber}
                    amount={grandTotal}
                    locale={locale}
                    guestAccessToken={currentGuestAccessToken || undefined}
                    guestAccessTokenExpiresAt={currentGuestAccessTokenExpiresAt || undefined}
                    onError={handlePaymentError}
                    autoConfirm={locale === 'ko' && prepareResult.gateway === 'toss'}
                  />
                ) : locale === 'ko' && selectedGateway === 'toss' ? (
                  <TossPaymentWidgetPreview
                    amount={grandTotal}
                    locale={locale}
                    onError={handlePaymentError}
                  />
                ) : (
                  <PaymentMethodSelector
                    gatewayOptions={gatewayOptions}
                    selectedGateway={selectedGateway}
                    onSelect={setSelectedGateway}
                    showCardSubmitButton
                  />
                )}
              </div>
            </section>

            {!isGuestCheckout && (
              <section className="surface-card p-6">
                <h2 className="typo-h3">{t('couponPoints')}</h2>
                <div className="mt-4">
                  <CouponSelector
                    onSelectionChange={(userCouponId, pointsToUse = 0) => {
                      setRequestedUserCouponId(userCouponId);
                      setRequestedPointsToUse(pointsToUse);
                    }}
                  />
                </div>
              </section>
            )}

            <section className="surface-card p-6">
              <h2 className="typo-h3">{t('consent.title')}</h2>
              <div className="mt-4 space-y-4">
                <label className="flex gap-3 rounded-md border border-soft bg-muted/20 p-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={requiredConsent}
                    onChange={(event) => setRequiredConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-foreground"
                    aria-describedby="checkout-required-consent-description"
                  />
                  <span>
                    <span className="font-medium">{t('consent.requiredLabel')}</span>
                    <span id="checkout-required-consent-description" className="mt-1 block whitespace-pre-line text-muted-foreground">
                      {t('consent.requiredDescription')}
                    </span>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className="layout-stack-md lg:sticky lg:top-24 lg:self-start">
            <OrderSummarySection
              checkoutItems={checkoutItems}
              locale={locale}
              subtotalAmount={totalAmount}
              shippingFee={shippingFee}
              freeShippingThreshold={freeShippingThreshold}
              couponDiscount={couponDiscount}
              pointsUsed={appliedPointsUsed}
              totalPayable={grandTotal}
            />
            <div className="hidden surface-card p-4 md:block">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">{t('total')}</span>
                <span className="typo-price-lg text-foreground">{formatCurrency(grandTotal, locale)}</span>
              </div>
              <Button
                type="submit"
                disabled={step !== 'idle' || !requiredConsent || !isPricingReady || pricingPreviewLoading}
                className="w-full"
              >
                {stepLabels[step]}
              </Button>
            </div>
          </aside>
        </div>
      </form>

      <div
        className={cn(
          'mobile-sticky-cta fixed z-40 border-t border-soft bg-background md:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-muted-foreground">{t('total')}</span>
            <span className="typo-price text-foreground">{formatCurrency(grandTotal, locale)}</span>
          </div>
          <Button
            type="submit"
            form="checkout-form"
            className="w-full"
            disabled={step !== 'idle' || !requiredConsent || !isPricingReady || pricingPreviewLoading}
          >
            {stepLabels[step]}
          </Button>
        </div>
      </div>
    </div>
  );
}
