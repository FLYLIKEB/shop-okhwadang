'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import { cn } from '@/components/ui/utils';
import type {
  CartItem,
  CheckoutGatewayName,
  Page,
  PreparePaymentResponse,
  PolicyConsentSnapshot,
  UserAddress,
} from '@/lib/api';
import { pagesApi, usersApi, type CurrentPolicyMetadata } from '@/lib/api';
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
import SafeHtml from '@/components/shared/common/SafeHtml';

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

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function getPolicyHtml(page: Page | undefined): string | null {
  const block = page?.blocks.find((candidate) => candidate.type === 'text_content');
  const html = block?.content.html;
  return typeof html === 'string' ? html : null;
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
  const [selectedWidgetPaymentMethodCode, setSelectedWidgetPaymentMethodCode] = useState<string | null>(null);
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
  const [policyConsents, setPolicyConsents] = useState<CurrentPolicyMetadata[]>([]);
  const [policyConsentLoading, setPolicyConsentLoading] = useState(true);
  const [policyConsentLoadError, setPolicyConsentLoadError] = useState(false);
  const [isPolicyListExpanded, setIsPolicyListExpanded] = useState(false);
  const [selectedPolicySlug, setSelectedPolicySlug] = useState<string | null>(null);
  const [policyPages, setPolicyPages] = useState<Record<string, Page>>({});
  const [policyContentLoadingSlug, setPolicyContentLoadingSlug] = useState<string | null>(null);
  const [requestedUserCouponId, setRequestedUserCouponId] = useState<number | undefined>();
  const [requestedPointsToUse, setRequestedPointsToUse] = useState(0);
  const paymentRef = useRef<PaymentGatewayHandle>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'manual' | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const isGuestCheckout = !isAuthenticated;
  const requiredConsent = policyConsents.length > 0;
  const policyConsentPayload: PolicyConsentSnapshot[] = policyConsents.map((policy) => ({
    slug: policy.slug,
    version: policy.version,
    effectiveDate: policy.effectiveDate,
  }));
  const couponDiscount = pricingPreview?.couponDiscount ?? 0;
  const appliedPointsUsed = pricingPreview?.appliedPointsUsed ?? 0;
  const shippingFee = pricingPreview?.shippingFee ?? 0;
  const freeShippingThreshold = pricingPreview?.freeShippingThreshold ?? 0;
  const isFreeShipping = pricingPreview?.isFreeShipping ?? false;
  const subtotalAmount = pricingPreview?.subtotalAmount ?? 0;
  const grandTotal = confirmedGrandTotal ?? pricingPreview?.totalPayable ?? 0;
  const isPricingReady = pricingPreview !== null || confirmedGrandTotal !== null;
  const selectedPolicy = policyConsents.find((policy) => policy.slug === selectedPolicySlug);
  const selectedPolicyHtml = selectedPolicy ? getPolicyHtml(policyPages[selectedPolicy.slug]) : null;
  const gatewayPaymentLabel = selectedGateway === 'toss'
    ? t('tossPayment')
    : selectedGateway === 'paypal'
      ? t('paypalPayment')
      : selectedGateway === 'eximbay'
        ? t('eximbayPayment')
        : t('bankTransferPayment');
  const tossPaymentMethodLabels: Record<string, string> = {
    CARD: t('paymentMethodLabels.card'),
    VIRTUAL_ACCOUNT: t('paymentMethodLabels.virtualAccount'),
    MOBILE_PHONE: t('paymentMethodLabels.mobilePhone'),
    TRANSFER: t('paymentMethodLabels.transfer'),
    TOSSPAY: t('paymentMethodLabels.tossPay'),
    NAVERPAY: t('paymentMethodLabels.naverPay'),
    KAKAOPAY: t('paymentMethodLabels.kakaoPay'),
    SAMSUNGPAY: t('paymentMethodLabels.samsungPay'),
    PAYCO: t('paymentMethodLabels.payco'),
    LPAY: t('paymentMethodLabels.lpay'),
    SSG: t('paymentMethodLabels.ssg'),
    APPLEPAY: t('paymentMethodLabels.applePay'),
    KBPAY: t('paymentMethodLabels.kbPay'),
    PINPAY: t('paymentMethodLabels.pinPay'),
    CULTURE_GIFT_CERTIFICATE: t('paymentMethodLabels.cultureGiftCertificate'),
    GAME_GIFT_CERTIFICATE: t('paymentMethodLabels.gameGiftCertificate'),
    BOOK_GIFT_CERTIFICATE: t('paymentMethodLabels.bookGiftCertificate'),
    PAYPAL: t('paypalPayment'),
  };
  const selectedPaymentMethodLabel = selectedWidgetPaymentMethodCode
    ? tossPaymentMethodLabels[selectedWidgetPaymentMethodCode] ?? gatewayPaymentLabel
    : gatewayPaymentLabel;
  const freeShippingProgress = freeShippingThreshold > 0
    ? Math.min((subtotalAmount / freeShippingThreshold) * 100, 100)
    : 100;
  const orderSummaryItems = (pricingPreview?.items ?? []).map((item) => {
    const checkoutItem = checkoutItems.find(
      (candidate) => candidate.productId === item.productId
        && candidate.productOptionId === item.productOptionId,
    );
    const thumbnail = checkoutItem?.product.images.find((image) => image.isThumbnail)
      ?? checkoutItem?.product.images[0];

    return {
      ...item,
      thumbnailUrl: thumbnail?.thumbnailUrl ?? thumbnail?.url ?? null,
      imageAlt: thumbnail?.alt ?? item.productName,
    };
  });

  const stepLabels: Record<PaymentStep, string> = {
    idle: t('steps.idle'),
    creating_order: t('steps.creating_order'),
    preparing_payment: t('steps.preparing_payment'),
    confirming_payment: t('steps.confirming_payment'),
    success: t('steps.success'),
  };
  const loadAddressErrorMessage = t('loadAddressError');
  const policyConsentLoadErrorMessage = t('consent.loadError');
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
  const { execute: loadPolicyContent } = useAsyncAction(
    ({ slug, policyLocale }: { slug: string; policyLocale: Locale }) =>
      pagesApi.getBySlug(slug, policyLocale),
    { errorMessage: t('consent.contentLoadError') },
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
    let active = true;
    setPolicyConsentLoading(true);
    setPolicyConsentLoadError(false);
    void pagesApi.getCurrentPolicies(locale)
      .then((policies) => {
        if (active) {
          setPolicyConsents(policies);
        }
      })
      .catch(() => {
        if (active) {
          setPolicyConsents([]);
          setPolicyConsentLoadError(true);
          toast.error(policyConsentLoadErrorMessage);
        }
      })
      .finally(() => {
        if (active) setPolicyConsentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale, policyConsentLoadErrorMessage]);

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
    setPricingPreview(null);
    setConfirmedGrandTotal(null);
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
    form.address,
    form.addressDetail,
    form.recipientName,
    form.recipientPhone,
    isGuestCheckout,
    locale,
    previewPricing,
    requestedPointsToUse,
    requestedUserCouponId,
    selectedAddressId,
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
    const nextValue = name === 'recipientPhone' ? formatPhoneInput(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddressSearch = (result: { zonecode: string; address: string; roadAddress: string; jibunAddress: string }) => {
    setForm((prev) => ({
      ...prev,
      zipcode: result.zonecode,
      address: result.address || result.roadAddress || result.jibunAddress,
    }));
    setErrors((prev) => ({ ...prev, zipcode: undefined, address: undefined }));
  };

  const handleGuestEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuestEmail(e.target.value);
    if (errors.guestEmail) {
      setErrors((prev) => ({ ...prev, guestEmail: undefined }));
    }
  };

  const handlePolicyOpen = (slug: string) => {
    setSelectedPolicySlug(slug);
    if (policyPages[slug]) return;

    setPolicyContentLoadingSlug(slug);
    void loadPolicyContent({ slug, policyLocale: locale })
      .then((page) => {
        if (page) {
          setPolicyPages((current) => ({ ...current, [slug]: page }));
        }
      })
      .finally(() => {
        setPolicyContentLoadingSlug((current) => (current === slug ? null : current));
      });
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
    policyConsents: policyConsentPayload,
    marketingConsent: false,
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

  const hasSelectedSavedAddress = !isGuestCheckout
    && typeof selectedAddressId === 'number';

  return (
    <div className="checkout-toss-theme min-h-screen pb-36 md:pb-8">
      <div className="layout-container layout-page max-w-3xl">
      <h1 className="checkout-toss-title typo-h1">{t('title')}</h1>

      <form id="checkout-form" onSubmit={handleSubmit} className="mt-8">
        <div className="mx-auto layout-stack-md">
          <OrderSummarySection
            pricedItems={orderSummaryItems}
            locale={locale}
            subtotalAmount={subtotalAmount}
            shippingFee={shippingFee}
            freeShippingThreshold={freeShippingThreshold}
            couponDiscount={couponDiscount}
            pointsUsed={appliedPointsUsed}
            totalPayable={grandTotal}
          />

            <section className="checkout-toss-section surface-card p-6">
              <h2 className="typo-h3">{t('shippingInfo')}</h2>

              <div className="mt-4 layout-stack-md">
                {isGuestCheckout ? (
                  <div className="checkout-toss-panel rounded-lg border border-soft bg-muted/20 p-4">
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
                      className="checkout-toss-input mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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

                {!hasSelectedSavedAddress && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ShippingFormSection form={form} errors={errors} onChange={handleChange} />
                      <PhoneInputSection form={form} errors={errors} onChange={handleChange} />
                    </div>
                    <ZipcodeInputSection
                      form={form}
                      errors={errors}
                      onChange={handleChange}
                      onAddressSearch={handleAddressSearch}
                      readOnly
                    />
                    <AddressInputSection form={form} errors={errors} onChange={handleChange} readOnly />
                    <AddressDetailInputSection form={form} onChange={handleChange} />
                  </>
                )}
                <MemoInputSection form={form} onChange={handleChange} />
              </div>
            </section>

            <section className="checkout-toss-section surface-card p-6">
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
                    onPaymentMethodChange={setSelectedWidgetPaymentMethodCode}
                    autoConfirm={locale === 'ko' && prepareResult.gateway === 'toss'}
                  />
                ) : locale === 'ko' && selectedGateway === 'toss' ? (
                  <TossPaymentWidgetPreview
                    amount={grandTotal}
                    locale={locale}
                    onError={handlePaymentError}
                    onPaymentMethodChange={setSelectedWidgetPaymentMethodCode}
                  />
                ) : (
                  <PaymentMethodSelector
                    gatewayOptions={gatewayOptions}
                    selectedGateway={selectedGateway}
                    onSelect={(gateway) => {
                      setSelectedGateway(gateway);
                      setSelectedWidgetPaymentMethodCode(null);
                    }}
                    showCardSubmitButton
                  />
                )}
              </div>
            </section>

            {!isGuestCheckout && (
              <section className="checkout-toss-section surface-card p-6">
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

            <section className="checkout-toss-section surface-card p-6">
              {policyConsentLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">{t('consent.loading')}</p>
              ) : policyConsentLoadError ? (
                <p className="mt-4 text-sm text-destructive">{t('consent.loadError')}</p>
              ) : (
                <div className="checkout-toss-panel overflow-hidden rounded-md border border-soft bg-muted/20 text-sm text-foreground">
                  <button
                    type="button"
                    onClick={() => setIsPolicyListExpanded((current) => !current)}
                    aria-expanded={isPolicyListExpanded}
                    aria-controls="checkout-policy-list"
                    aria-label={t(isPolicyListExpanded ? 'consent.hidePolicy' : 'consent.showPolicy')}
                    className="flex min-h-12 w-full items-center justify-between gap-3 p-4 text-left font-medium transition-colors hover:bg-muted/50"
                  >
                    <span>{t('consent.title')}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isPolicyListExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isPolicyListExpanded && (
                    <div id="checkout-policy-list" className="border-t border-soft p-2">
                      {policyConsents.map((policy) => (
                        <button
                          key={policy.slug}
                          type="button"
                          onClick={() => handlePolicyOpen(policy.slug)}
                          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-background"
                        >
                          <span>{policy.title}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
            <Modal
              isOpen={selectedPolicySlug !== null}
              onClose={() => setSelectedPolicySlug(null)}
              maxWidth="lg"
              className="max-h-screen overflow-y-auto"
            >
              {selectedPolicySlug && (
                <>
                  <h2 className="mb-4 pr-8 typo-h3">{selectedPolicy?.title}</h2>
                  {policyContentLoadingSlug === selectedPolicySlug ? (
                    <p className="text-sm text-muted-foreground">{t('consent.contentLoading')}</p>
                  ) : selectedPolicyHtml ? (
                    <SafeHtml
                      html={selectedPolicyHtml}
                      className="prose max-w-none text-sm"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('consent.contentUnavailable')}</p>
                  )}
                </>
              )}
            </Modal>
          <div className="checkout-toss-submit-card hidden surface-card p-4 md:block">
              {isFreeShipping && (
                <div className="checkout-toss-free-shipping mb-3 rounded-md bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t('freeShippingUnlocked')}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${freeShippingProgress}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              )}
              <div className="mb-2 flex justify-end">
                <span className="text-xs text-muted-foreground">{selectedPaymentMethodLabel}</span>
              </div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">{t('total')}</span>
                <span className="typo-price-lg text-foreground">{formatCurrency(grandTotal, locale)}</span>
              </div>
              {isFreeShipping && (
                <div className="checkout-toss-free-shipping mb-2 rounded-md bg-muted/20 p-2.5">
                  <p className="text-xs text-muted-foreground">{t('freeShippingUnlocked')}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${freeShippingProgress}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              )}
              <p className="checkout-toss-consent-confirmation mb-3 text-center text-sm text-muted-foreground">
                {t('consent.confirmation')}
              </p>
              <Button
                type="submit"
                variant="brown"
                disabled={step !== 'idle' || !requiredConsent || !isPricingReady || pricingPreviewLoading}
                className="w-full"
              >
                {stepLabels[step]}
              </Button>
          </div>
        </div>
      </form>

      <div
        className={cn(
          'checkout-toss-mobile-cta mobile-sticky-cta fixed z-40 border-t border-soft bg-background md:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          <div className="mb-2 flex justify-end">
            <span className="text-xs text-muted-foreground">{selectedPaymentMethodLabel}</span>
          </div>
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-muted-foreground">{t('total')}</span>
            <span className="typo-price text-foreground">{formatCurrency(grandTotal, locale)}</span>
          </div>
          {isFreeShipping && (
            <p className="mb-2 text-right text-xs text-muted-foreground">{t('freeShippingUnlocked')}</p>
          )}
          <p className="checkout-toss-consent-confirmation mb-3 text-center text-sm text-muted-foreground">
            {t('consent.confirmation')}
          </p>
          <Button
            type="submit"
            form="checkout-form"
            variant="brown"
            className="w-full"
            disabled={step !== 'idle' || !requiredConsent || !isPricingReady || pricingPreviewLoading}
          >
            {stepLabels[step]}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
