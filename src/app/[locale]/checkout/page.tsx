'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import type { CartItem, PreparePaymentResponse, UserAddress } from '@/lib/api';
import { usersApi } from '@/lib/api';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/constants/shipping';
import { SESSION_KEYS } from '@/constants/storage';
import type { Locale } from '@/i18n/routing';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import { AddressSelectorSection } from '@/components/shared/checkout/AddressSelectorSection';
import { OrderSummarySection } from '@/components/shared/checkout/OrderSummarySection';
import {
  ShippingFormSection,
  PhoneInputSection,
  ZipcodeInputSection,
  AddressInputSection,
  AddressDetailInputSection,
  MemoInputSection,
} from '@/components/shared/checkout/ShippingFormSection';
import { useCheckout, type PaymentStep } from '@/components/shared/hooks/useCheckout';

// Re-exported for type usage

const STEP_LABELS: Record<PaymentStep, string> = {
  idle: '결제하기',
  creating_order: '주문 생성 중...',
  preparing_payment: '결제 준비 중...',
  confirming_payment: '결제 확인 중...',
  success: '완료',
};

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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { refetch } = useCart();

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<PaymentStep>('idle');
  const [prepareResult, setPrepareResult] = useState<PreparePaymentResponse | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string>('');
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
    usersApi.getAddresses()
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
        toast.error('저장된 주소를 불러오는데 실패했습니다.');
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 typo-h1">주문 / 결제</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-lg border p-6 space-y-4">
              <h2 className="typo-h3">배송 정보</h2>

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
            </section>

            <section className="rounded-lg border p-6 space-y-4">
              <h2 className="typo-h3">결제 수단</h2>
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
                <p className="text-sm text-muted-foreground">
                  주문 정보 입력 후 결제 수단이 표시됩니다.
                </p>
              )}
            </section>

            <section className="rounded-lg border p-6 space-y-2 opacity-50">
              <h2 className="typo-h3">쿠폰 / 적립금</h2>
              <p className="text-sm text-muted-foreground">쿠폰/적립금 적용은 추후 지원 예정입니다.</p>
            </section>
          </div>

          <div className="space-y-4">
            <OrderSummarySection checkoutItems={checkoutItems} locale={locale} />

            <button
              type="submit"
              disabled={step !== 'idle'}
              className="w-full rounded-md bg-foreground py-3 typo-button text-background hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {STEP_LABELS[step]}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}