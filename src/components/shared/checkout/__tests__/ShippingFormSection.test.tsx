import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  ShippingFormSection,
  PhoneInputSection,
  ZipcodeInputSection,
  AddressInputSection,
  AddressDetailInputSection,
  MemoInputSection,
} from '@/components/shared/checkout/ShippingFormSection';
import type { ShippingForm, FormErrors } from '@/app/[locale]/checkout/page';

const baseForm: ShippingForm = {
  recipientName: '',
  recipientPhone: '',
  zipcode: '',
  address: '',
  addressDetail: '',
  memo: '',
};

describe('ShippingFormSection', () => {
  it('받는 분 이름 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<ShippingFormSection form={baseForm} errors={{}} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/받는 분 이름/), '홍길동');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.target.name).toBe('recipientName');
  });

  it('errors.recipientName 있으면 에러 메시지 표시', () => {
    const errors: FormErrors = { recipientName: '받는 분 이름을 입력하세요.' };
    render(<ShippingFormSection form={baseForm} errors={errors} onChange={vi.fn()} />);
    expect(screen.getByText('받는 분 이름을 입력하세요.')).toBeInTheDocument();
  });

  it('errors 없으면 에러 메시지 미표시', () => {
    render(<ShippingFormSection form={baseForm} errors={{}} onChange={vi.fn()} />);
    expect(screen.queryByText(/입력하세요/)).not.toBeInTheDocument();
  });

  it('form.recipientName 값이 input에 반영', () => {
    render(
      <ShippingFormSection
        form={{ ...baseForm, recipientName: '김철수' }}
        errors={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('김철수');
  });
});

describe('PhoneInputSection', () => {
  it('연락처 입력 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<PhoneInputSection form={baseForm} errors={{}} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/연락처/), '010');
    expect(onChange).toHaveBeenCalled();
  });

  it('errors.recipientPhone 표시', () => {
    render(
      <PhoneInputSection
        form={baseForm}
        errors={{ recipientPhone: '연락처를 입력하세요.' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('연락처를 입력하세요.')).toBeInTheDocument();
  });
});

describe('ZipcodeInputSection', () => {
  it('우편번호 maxLength=5', () => {
    render(<ZipcodeInputSection form={baseForm} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/우편번호/)).toHaveAttribute('maxLength', '5');
  });

  it('errors.zipcode 표시', () => {
    render(
      <ZipcodeInputSection
        form={baseForm}
        errors={{ zipcode: '우편번호를 입력하세요.' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('우편번호를 입력하세요.')).toBeInTheDocument();
  });
});

describe('AddressInputSection', () => {
  it('주소 입력 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<AddressInputSection form={baseForm} errors={{}} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/^주소/), '서울');
    expect(onChange).toHaveBeenCalled();
  });

  it('errors.address 표시', () => {
    render(
      <AddressInputSection
        form={baseForm}
        errors={{ address: '주소를 입력하세요.' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('주소를 입력하세요.')).toBeInTheDocument();
  });
});

describe('AddressDetailInputSection', () => {
  it('상세 주소는 선택적 — 에러 없음', () => {
    render(<AddressDetailInputSection form={baseForm} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/상세 주소/)).toBeInTheDocument();
  });

  it('상세 주소 입력 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<AddressDetailInputSection form={baseForm} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/상세 주소/), '101호');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('MemoInputSection', () => {
  it('배송 메모 textarea 렌더', () => {
    render(<MemoInputSection form={baseForm} onChange={vi.fn()} />);
    const memo = screen.getByLabelText(/배송 메모/);
    expect(memo.tagName).toBe('TEXTAREA');
  });

  it('memo 입력 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<MemoInputSection form={baseForm} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText(/배송 메모/), '문 앞');
    expect(onChange).toHaveBeenCalled();
  });
});
