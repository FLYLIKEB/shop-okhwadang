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
import type { CartItem, PreparePaymentResponse, UserAddress } from '@/lib/api';
import { usersApi } from '@/lib/api';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/constants/shipping';
import { SESSION_KEYS } from '@/constants/storage';
import type { Locale } from '@/i18n/routing';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import { AddressSelectorSection } from '@/components/shared/checkout/AddressSelectorSection';
import { OrderSummarySection } from '@/components/shared/checkout/OrderSummarySection';
import {
  AddressDetailInputSection,
  AddressInputSection,
  MemoInputSection,
  PhoneInputSection,
  ShippingFormSection,
  ZipcodeInputSection,
} from '@/components/shared/checkout/ShippingFormSection';
import { useCheckout, type PaymentStep } from '@/components/shared/hooks/useCheckout';
import { formatCurrency } from '@/utils/currency';

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
  const [step, setStep] = useState<PaymentStep>('idle');
  const [prepareResult, setPrepareResult] = useState<PreparePaymentResponse | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [form, setForm] = useState<ShippingForm>({
    recipientName: '',
    recipientPhone: '',
    zipcode: '',
    address: '',
    addressDetail: '',
    memo: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const paymentRef = useRef<PaymentGatewayHandle>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'manual' | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const totalAmount = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = totalAmount + shippingFee;

  const stepLabels: Record<PaymentStep, string> = {
    idle: t('steps.idle'),
    creating_order: t('steps.creating_order'),
    preparing_payment: t('steps.preparing_payment'),
    confirming_payment: t('steps.confirming_payment'),
    success: t('steps.success'),
  };

  const fillFormFromAddress = (addr: UserAddress) => {
    setForm({
      recipientName: addr.recipientName,
      recipientPhone: addr.phone,
      zipcode: addr.zipcode,
      address: addr.address,
      addressDetail: addr.addressDetail ?? '',
      memo: '',
    });
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
      return;
    }
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
    } catch {
      router.replace(`/${locale}/cart`);
    }
  }, [isAuthenticated, isLoading, locale, router]);

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
        toast.error(t('loadAddressError'));
      })
      .finally(() => {
        setAddressLoading(false);
      });
  }, [isAuthenticated, isLoading]);

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

  const { handleSubmit, handlePaymentError } = useCheckout({
    checkoutItems,
    form,
    grandTotal,
    locale,
    paymentRef,
    prepareResult,
    currentOrderId,
    currentOrderNumber,
    setStep,
    setPrepareResult,
    setCurrentOrderId,
    setCurrentOrderNumber,
    refetch,
  });

  if (checkoutItems.length === 0) {
    return null;
  }

  return (
    <div className="layout-container layout-page pb-36 md:pb-8">
      <h1 className="typo-h1">{t('title')}</h1>

      <ol className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground md:max-w-xl">
        <li className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">{t('flow.shipping')}</li>
        <span aria-hidden>→</span>
        <li className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{t('flow.payment')}</li>
        <span aria-hidden>→</span>
        <li className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{t('flow.complete')}</li>
      </ol>

      <form id="checkout-form" onSubmit={handleSubmit} className="mt-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="layout-stack-md lg:col-span-2">
            <section className="rounded-lg border p-6">
              <h2 className="typo-h3">{t('shippingInfo')}</h2>

              <div className="mt-4 layout-stack-md">
                <AddressSelectorSection
                  addresses={addresses}
                  selectedAddressId={selectedAddressId}
                  addressLoading={addressLoading}
                  onSelect={handleAddressSelect}
                  locale={locale}
                />

                <ShippingFormSection form={form} errors={errors} onChange={handleChange} />
                <PhoneInputSection form={form} errors={errors} onChange={handleChange} />
                <ZipcodeInputSection form={form} errors={errors} onChange={handleChange} />
                <AddressInputSection form={form} errors={errors} onChange={handleChange} />
                <AddressDetailInputSection form={form} onChange={handleChange} />
                <MemoInputSection form={form} onChange={handleChange} />
              </div>
            </section>

            <section className="rounded-lg border p-6">
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
                    onError={handlePaymentError}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('paymentMethodHint')}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border p-6 opacity-70">
              <h2 className="typo-h3">{t('couponPoints')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('couponPointsComingSoon')}</p>
            </section>
          </div>

          <div className="layout-stack-md">
            <OrderSummarySection checkoutItems={checkoutItems} locale={locale} />
            <div className="hidden rounded-lg border border-border p-4 lg:block">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">{t('total')}</span>
                <span className="typo-h2">{formatCurrency(grandTotal, locale)}</span>
              </div>
              <Button type="submit" disabled={step !== 'idle'} className="w-full">
                {stepLabels[step]}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <div
        className={cn(
          'mobile-sticky-cta fixed z-50 border-t border-border bg-background md:hidden',
          isNavVisible ? 'mobile-sticky-cta--above-nav' : 'mobile-sticky-cta--bottom',
        )}
      >
        <div className="mobile-sticky-inner">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-xs text-muted-foreground">{t('total')}</span>
            <span className="typo-title">{formatCurrency(grandTotal, locale)}</span>
          </div>
          <Button type="submit" form="checkout-form" className="w-full" disabled={step !== 'idle'}>
            {stepLabels[step]}
          </Button>
        </div>
      </div>
    </div>
  );
}
