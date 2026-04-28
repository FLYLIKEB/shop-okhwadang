import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
  CartItem,
  PreparePaymentResponse,
  OrderResponse,
} from '@/lib/api';
import type { ShippingForm } from '@/app/[locale]/checkout/page';
import type { PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import {
  useCheckout,
  type UseCheckoutOptions,
  type PaymentStep,
} from '../useCheckout';

const mockReplace = vi.fn();
const mockOrdersCreate = vi.fn();
const mockPaymentsPrepare = vi.fn();
const mockPaymentsConfirm = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  ordersApi: {
    create: (...args: unknown[]) => mockOrdersCreate(...args),
  },
  paymentsApi: {
    prepare: (...args: unknown[]) => mockPaymentsPrepare(...args),
    confirm: (...args: unknown[]) => mockPaymentsConfirm(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';

const validForm: ShippingForm = {
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '12345',
  address: '서울시 강남구 테헤란로',
  addressDetail: '101호',
  memo: '문 앞에',
};

const mockItem: CartItem = {
  id: 1,
  productId: 10,
  productOptionId: null,
  quantity: 2,
  unitPrice: 15000,
  subtotal: 30000,
  product: {
    id: 10,
    name: '테스트 상품',
    slug: 'test',
    price: 15000,
    salePrice: null,
    status: 'active',
    images: [],
  },
  option: null,
};

const mockOrder: OrderResponse = {
  id: 100,
  orderNumber: 'ORD-100',
  status: 'pending',
  totalAmount: 30000,
  discountAmount: 0,
  shippingFee: 0,
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '12345',
  address: '서울시',
  addressDetail: '101호',
  memo: null,
  items: [],
  createdAt: '2026-04-25T00:00:00Z',
};

interface OptionsState {
  step: PaymentStep;
  prepareResult: PreparePaymentResponse | null;
  currentOrderId: number | null;
  currentOrderNumber: string;
}

function makeOptions(
  overrides: Partial<UseCheckoutOptions> = {},
): { options: UseCheckoutOptions; state: OptionsState; paymentRef: { current: PaymentGatewayHandle | null }; refetch: ReturnType<typeof vi.fn> } {
  const state: OptionsState = {
    step: 'idle',
    prepareResult: null,
    currentOrderId: null,
    currentOrderNumber: '',
  };
  const refetch = vi.fn().mockResolvedValue(undefined);
  const paymentRef = { current: null as PaymentGatewayHandle | null };

  const options: UseCheckoutOptions = {
    checkoutItems: [mockItem],
    form: validForm,
    grandTotal: 30000,
    locale: 'ko',
    paymentRef,
    prepareResult: state.prepareResult,
    currentOrderId: state.currentOrderId,
    currentOrderNumber: state.currentOrderNumber,
    setStep: vi.fn((s: PaymentStep) => { state.step = s; }),
    setPrepareResult: vi.fn((r) => { state.prepareResult = r; }),
    setCurrentOrderId: vi.fn((id) => { state.currentOrderId = id; }),
    setCurrentOrderNumber: vi.fn((n) => { state.currentOrderNumber = n; }),
    refetch,
    ...overrides,
  };

  return { options, state, paymentRef, refetch };
}

function makeFormEvent(): React.FormEvent {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent;
}

describe('useCheckout - 폼 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이름이 2자 미만이면 주문 생성을 호출하지 않는다', async () => {
    const { options } = makeOptions({
      form: { ...validForm, recipientName: 'A' },
    });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(mockOrdersCreate).not.toHaveBeenCalled();
    expect(options.setStep).not.toHaveBeenCalledWith('creating_order');
  });

  it('전화번호 형식이 잘못되면 주문 생성을 호출하지 않는다', async () => {
    const { options } = makeOptions({
      form: { ...validForm, recipientPhone: '01012345678' },
    });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(mockOrdersCreate).not.toHaveBeenCalled();
  });

  it('우편번호가 5자리가 아니면 주문 생성을 호출하지 않는다', async () => {
    const { options } = makeOptions({
      form: { ...validForm, zipcode: '1234' },
    });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(mockOrdersCreate).not.toHaveBeenCalled();
  });

  it('주소가 비어 있으면 주문 생성을 호출하지 않는다', async () => {
    const { options } = makeOptions({
      form: { ...validForm, address: '   ' },
    });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(mockOrdersCreate).not.toHaveBeenCalled();
  });
});

describe('useCheckout - Mock 결제 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mock_client_key 응답 시 결제 확인까지 자동 진행 후 라우팅', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      amount: 30000,
      gateway: 'mock',
      clientKey: 'mock_client_key',
    };
    mockOrdersCreate.mockResolvedValue(mockOrder);
    mockPaymentsPrepare.mockResolvedValue(prepareResult);
    mockPaymentsConfirm.mockResolvedValue({
      paymentId: 1,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      status: 'confirmed',
      method: 'mock',
      amount: 30000,
      paidAt: '2026-04-25T00:00:00Z',
    });

    const { options, refetch } = makeOptions();
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ productId: 10, productOptionId: null, quantity: 2 }],
        recipientName: '홍길동',
        recipientPhone: '010-1234-5678',
        zipcode: '12345',
      }),
    );
    expect(mockPaymentsPrepare).toHaveBeenCalledWith({ orderId: mockOrder.id, locale: 'ko' });
    expect(mockPaymentsConfirm).toHaveBeenCalledWith({
      orderId: mockOrder.id,
      paymentKey: `mock-${mockOrder.orderNumber}`,
      amount: 30000,
    });
    expect(toast.success).toHaveBeenCalledWith('결제가 완료되었습니다.');
    expect(refetch).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(
      `/ko/order/complete?orderId=${mockOrder.id}&orderNumber=${mockOrder.orderNumber}`,
    );
    expect(options.setStep).toHaveBeenCalledWith('creating_order');
    expect(options.setStep).toHaveBeenCalledWith('preparing_payment');
    expect(options.setStep).toHaveBeenCalledWith('confirming_payment');
    expect(options.setStep).toHaveBeenCalledWith('success');
  });
});

describe('useCheckout - Stripe 결제 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Stripe 응답 시 prepareResult를 set하고 사용자 입력 대기 (idle)', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 2,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      amount: 30000,
      gateway: 'stripe',
      clientKey: 'pi_xxx_secret_yyy',
    };
    mockOrdersCreate.mockResolvedValue(mockOrder);
    mockPaymentsPrepare.mockResolvedValue(prepareResult);

    const { options } = makeOptions({ locale: 'en' });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(options.setCurrentOrderId).toHaveBeenCalledWith(mockOrder.id);
    expect(options.setCurrentOrderNumber).toHaveBeenCalledWith(mockOrder.orderNumber);
    expect(options.setPrepareResult).toHaveBeenCalledWith(prepareResult);
    expect(options.setStep).toHaveBeenCalledWith('idle');
    expect(toast.info).toHaveBeenCalledWith('카드 정보를 입력하고 결제하기를 눌러주세요.');
    expect(mockPaymentsConfirm).not.toHaveBeenCalled();
  });

  it('이미 prepareResult(stripe) 상태에서 submit하면 paymentRef.confirm() 호출', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 2,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      amount: 30000,
      gateway: 'stripe',
      clientKey: 'pi_xxx_secret_yyy',
    };
    const confirmSpy = vi.fn().mockResolvedValue(undefined);
    const { options } = makeOptions({
      prepareResult,
      paymentRef: { current: { confirm: confirmSpy } },
    });

    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(options.setStep).toHaveBeenCalledWith('confirming_payment');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockOrdersCreate).not.toHaveBeenCalled();
  });

  it('Stripe confirm 실패 시 에러 토스트 + step을 idle로 초기화', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 2,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      amount: 30000,
      gateway: 'stripe',
      clientKey: 'pi_xxx_secret_yyy',
    };
    const confirmSpy = vi.fn().mockRejectedValue(new Error('카드 거절'));
    const { options } = makeOptions({
      prepareResult,
      paymentRef: { current: { confirm: confirmSpy } },
    });

    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(toast.error).toHaveBeenCalledWith('카드 거절');
    expect(options.setStep).toHaveBeenCalledWith('idle');
    expect(options.setPrepareResult).toHaveBeenCalledWith(null);
  });
});

describe('useCheckout - Toss 결제 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('locale=ko + 실제 clientKey 응답 시 paymentRef.confirm을 setTimeout으로 호출', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 3,
      orderId: mockOrder.id,
      orderNumber: mockOrder.orderNumber,
      amount: 30000,
      gateway: 'toss',
      clientKey: 'test_ck_realkey',
    };
    mockOrdersCreate.mockResolvedValue(mockOrder);
    mockPaymentsPrepare.mockResolvedValue(prepareResult);

    const confirmSpy = vi.fn().mockResolvedValue(undefined);
    const { options } = makeOptions({
      paymentRef: { current: { confirm: confirmSpy } },
    });
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(options.setCurrentOrderId).toHaveBeenCalledWith(mockOrder.id);
    expect(options.setCurrentOrderNumber).toHaveBeenCalledWith(mockOrder.orderNumber);
    expect(options.setPrepareResult).toHaveBeenCalledWith(prepareResult);
    // confirm은 setTimeout 100ms 이후 호출
    expect(confirmSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockPaymentsConfirm).not.toHaveBeenCalled();
  });
});

describe('useCheckout - 에러 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('주문 생성 실패 시 toast.error 호출 + step idle 복귀', async () => {
    mockOrdersCreate.mockRejectedValue(new Error('재고 부족'));

    const { options } = makeOptions();
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(toast.error).toHaveBeenCalledWith('재고 부족');
    expect(options.setStep).toHaveBeenLastCalledWith('idle');
    expect(mockPaymentsPrepare).not.toHaveBeenCalled();
  });

  it('paymentsApi.prepare 실패 시 toast.error + step idle', async () => {
    mockOrdersCreate.mockResolvedValue(mockOrder);
    mockPaymentsPrepare.mockRejectedValue(new Error('PG 통신 오류'));

    const { options } = makeOptions();
    const { result } = renderHook(() => useCheckout(options));

    await act(async () => {
      await result.current.handleSubmit(makeFormEvent());
    });

    expect(toast.error).toHaveBeenCalledWith('PG 통신 오류');
    expect(options.setStep).toHaveBeenLastCalledWith('idle');
  });

  it('handlePaymentError 는 메시지를 토스트로 보여주고 step을 idle로 reset', () => {
    const { options } = makeOptions();
    const { result } = renderHook(() => useCheckout(options));

    act(() => {
      result.current.handlePaymentError('결제가 취소되었습니다.');
    });

    expect(toast.error).toHaveBeenCalledWith('결제가 취소되었습니다.');
    expect(options.setStep).toHaveBeenCalledWith('idle');
    expect(options.setPrepareResult).toHaveBeenCalledWith(null);
  });
});
