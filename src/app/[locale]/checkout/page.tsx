'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import type { CartItem, PreparePaymentResponse, UserAddress } from '@/lib/api';
import { ordersApi, paymentsApi, usersApi } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import type { Locale } from '@/i18n/routing';
import PaymentGateway from '@/components/checkout/PaymentGateway';

type PaymentStep = 'idle' | 'creating_order' | 'preparing_payment' | 'confirming_payment' | 'success';

const STEP_LABELS: Record<PaymentStep, string> = {
  idle: '결제하기',
  creating_order: '주문 생성 중...',
  preparing_payment: '결제 준비 중...',
  confirming_payment: '결제 확인 중...',
  success: '완료',
};

interface ShippingForm {
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string;
}

interface FormErrors {
  recipientName?: string;
  recipientPhone?: string;
  zipcode?: string;
  address?: string;
}

function validateForm(form: ShippingForm): FormErrors {
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
  return errors;
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
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'manual' | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

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
    const raw = sessionStorage.getItem('checkoutItems');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

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

  const totalAmount = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = totalAmount >= 30000 ? 0 : 3000;
  const grandTotal = totalAmount + shippingFee;

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

  const handlePaymentError = (message: string) => {
    toast.error(message);
    setStep('idle');
    setPrepareResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If already prepared (Stripe), trigger stripe confirm
    if (prepareResult && prepareResult.gateway === 'stripe') {
      const stripeConfirm = (window as Window & { __stripeConfirm?: () => Promise<void> }).__stripeConfirm;
      if (stripeConfirm) {
        setStep('confirming_payment');
        try {
          await stripeConfirm();
          // Stripe redirects on success — if we reach here it means redirect pending
        } catch (err) {
          handlePaymentError(err instanceof Error ? err.message : '결제에 실패했습니다.');
        }
        return;
      }
    }

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setStep('creating_order');
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

      setStep('preparing_payment');
      const result: PreparePaymentResponse = await paymentsApi.prepare(
        { orderId: order.id, locale },
      );

      // Toss flow: invoke __tossPayHandler
      const isToss =
        locale === 'ko' &&
        result.clientKey &&
        result.clientKey !== 'mock_client_key';

      if (isToss) {
        setCurrentOrderId(order.id);
        setCurrentOrderNumber(order.orderNumber);
        setPrepareResult(result);
        // PaymentGateway component registers __tossPayHandler in useEffect
        // Give it a tick to register, then call it
        setTimeout(async () => {
          const tossHandler = (window as Window & { __tossPayHandler?: () => Promise<void> }).__tossPayHandler;
          if (tossHandler) {
            await tossHandler();
          }
        }, 100);
        return;
      }

      // Stripe flow: render Payment Element
      const isStripe =
        result.gateway === 'stripe' &&
        result.clientKey &&
        result.clientKey !== 'mock_client_key';

      if (isStripe) {
        setCurrentOrderId(order.id);
        setCurrentOrderNumber(order.orderNumber);
        setPrepareResult(result);
        setStep('idle');
        toast.info('카드 정보를 입력하고 결제하기를 눌러주세요.');
        return;
      }

      // Mock flow
      setStep('confirming_payment');
      await paymentsApi.confirm(
        { orderId: order.id, paymentKey: `mock-${order.orderNumber}`, amount: grandTotal },
      );

      setStep('success');
      toast.success('결제가 완료되었습니다.');
      sessionStorage.removeItem('checkoutItems');
      await refetch();
      router.replace(`/${locale}/order/complete?orderId=${order.id}&orderNumber=${order.orderNumber}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 중 오류가 발생했습니다.';
      toast.error(message);
      setStep('idle');
    }
  };

  if (checkoutItems.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">주문 / 결제</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Shipping form */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-lg border p-6 space-y-4">
              <h2 className="text-lg font-semibold">배송 정보</h2>

              {addressLoading && (
                <p className="text-sm text-muted-foreground">주소 불러오는 중...</p>
              )}

              {!addressLoading && addresses.length === 0 && (
                <div className="flex items-center justify-between rounded-md border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">저장된 배송지가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/${locale}/my/address`)}
                    className="text-sm font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    배송지 추가
                  </button>
                </div>
              )}

              {!addressLoading && addresses.length > 0 && (
                <div className="space-y-2 border-b pb-4">
                  {addresses.map((addr) => (
                    <label key={addr.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => handleAddressSelect(addr.id)}
                        className="mt-1 accent-foreground"
                      />
                      <span className="text-sm">
                        <span className="font-medium">{addr.label ?? '주소'}</span>{' '}
                        {addr.recipientName} {addr.phone}{' '}
                        <span className="text-muted-foreground">
                          {addr.address} {addr.addressDetail ?? ''}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddressId === 'manual'}
                      onChange={() => handleAddressSelect('manual')}
                      className="accent-foreground"
                    />
                    <span className="text-sm">직접 입력</span>
                  </label>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="recipientName" className="text-sm font-medium">
                  받는 분 이름 <span className="text-destructive">*</span>
                </label>
                <input
                  id="recipientName"
                  name="recipientName"
                  type="text"
                  value={form.recipientName}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
                {errors.recipientName && (
                  <p className="text-xs text-destructive">{errors.recipientName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="recipientPhone" className="text-sm font-medium">
                  연락처 <span className="text-destructive">*</span>
                </label>
                <input
                  id="recipientPhone"
                  name="recipientPhone"
                  type="text"
                  value={form.recipientPhone}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
                {errors.recipientPhone && (
                  <p className="text-xs text-destructive">{errors.recipientPhone}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="zipcode" className="text-sm font-medium">
                  우편번호 <span className="text-destructive">*</span>
                </label>
                <input
                  id="zipcode"
                  name="zipcode"
                  type="text"
                  value={form.zipcode}
                  onChange={handleChange}
                  placeholder="12345"
                  maxLength={5}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
                {errors.zipcode && (
                  <p className="text-xs text-destructive">{errors.zipcode}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="address" className="text-sm font-medium">
                  주소 <span className="text-destructive">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="서울특별시 강남구 테헤란로 123"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="addressDetail" className="text-sm font-medium">
                  상세 주소
                </label>
                <input
                  id="addressDetail"
                  name="addressDetail"
                  type="text"
                  value={form.addressDetail}
                  onChange={handleChange}
                  placeholder="동/호수 등"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="memo" className="text-sm font-medium">
                  배송 메모
                </label>
                <textarea
                  id="memo"
                  name="memo"
                  value={form.memo}
                  onChange={handleChange}
                  placeholder="배송 시 요청사항을 입력해주세요."
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                />
              </div>
            </section>

            {/* Payment method */}
            <section className="rounded-lg border p-6 space-y-4">
              <h2 className="text-lg font-semibold">결제 수단</h2>
              {prepareResult ? (
                <PaymentGateway
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

            {/* Coupon / points placeholder */}
            <section className="rounded-lg border p-6 space-y-2 opacity-50">
              <h2 className="text-lg font-semibold">쿠폰 / 적립금</h2>
              <p className="text-sm text-muted-foreground">쿠폰/적립금 적용은 추후 지원 예정입니다.</p>
            </section>
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <section className="rounded-lg border p-6 space-y-4 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold">주문 상품</h2>

              <ul className="divide-y text-sm">
                {checkoutItems.map((item) => (
                  <li key={item.id} className="py-3 space-y-0.5">
                    <p className="font-medium">{item.product.name}</p>
                    {item.option && (
                      <p className="text-muted-foreground text-xs">
                        {item.option.name}: {item.option.value}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {formatCurrency(item.unitPrice, locale)} × {item.quantity}개 ={' '}
                      {formatCurrency(item.subtotal, locale)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span>{formatCurrency(totalAmount, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">배송비</span>
                  <span>{shippingFee === 0 ? '무료' : formatCurrency(shippingFee, locale)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold">
                  <span>합계</span>
                  <span>{formatCurrency(grandTotal, locale)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={step !== 'idle'}
                className="w-full rounded-md bg-foreground py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {STEP_LABELS[step]}
              </button>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
