import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ProductOptionsEditor, {
  type ProductOptionDraft,
} from '@/components/shared/admin/ProductOptionsEditor';

const sampleOptions: ProductOptionDraft[] = [
  { name: '색상', value: '검정', priceAdjustment: 0, stock: 10 },
  { name: '색상', value: '빨강', priceAdjustment: 1000, stock: 5 },
];

describe('ProductOptionsEditor', () => {
  it('options=[] → 빈 상태 메시지', () => {
    render(<ProductOptionsEditor options={[]} onChange={vi.fn()} />);
    expect(screen.getByText('옵션이 없습니다.')).toBeInTheDocument();
  });

  it('options 렌더링 — 입력값 채워짐', () => {
    render(<ProductOptionsEditor options={sampleOptions} onChange={vi.fn()} />);
    expect(screen.getAllByDisplayValue('색상')).toHaveLength(2);
    expect(screen.getByDisplayValue('검정')).toBeInTheDocument();
    expect(screen.getByDisplayValue('빨강')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('"+ 옵션 추가" 클릭 → 빈 옵션 추가된 배열 onChange', async () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /옵션 추가/ }));
    expect(onChange).toHaveBeenCalledWith([
      ...sampleOptions,
      { name: '', value: '', priceAdjustment: 0, stock: 0 },
    ]);
  });

  it('options=[] 에서 옵션 추가 → 단일 빈 옵션 배열', async () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /옵션 추가/ }));
    expect(onChange).toHaveBeenCalledWith([
      { name: '', value: '', priceAdjustment: 0, stock: 0 },
    ]);
  });

  it('옵션명 변경 → onChange(해당 인덱스만 갱신)', () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    const nameInputs = screen.getAllByPlaceholderText('예: 색상');
    fireEvent.change(nameInputs[0], { target: { value: '사이즈' } });
    expect(onChange).toHaveBeenCalledWith([
      { ...sampleOptions[0], name: '사이즈' },
      sampleOptions[1],
    ]);
  });

  it('값 변경 → onChange', () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    const valueInputs = screen.getAllByPlaceholderText('예: 빨강');
    fireEvent.change(valueInputs[1], { target: { value: '파랑' } });
    expect(onChange).toHaveBeenCalledWith([
      sampleOptions[0],
      { ...sampleOptions[1], value: '파랑' },
    ]);
  });

  it('추가금액 변경 → number 변환 후 onChange', () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    const priceInputs = screen.getAllByRole('spinbutton');
    // index 0 = priceAdjustment[0], 1 = stock[0], 2 = priceAdjustment[1], 3 = stock[1]
    fireEvent.change(priceInputs[0], { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith([
      { ...sampleOptions[0], priceAdjustment: 500 },
      sampleOptions[1],
    ]);
  });

  it('재고 변경 → number 변환 후 onChange', () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[1], { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith([
      { ...sampleOptions[0], stock: 99 },
      sampleOptions[1],
    ]);
  });

  it('"x" 버튼 → 해당 인덱스 제거 후 onChange', async () => {
    const onChange = vi.fn();
    render(<ProductOptionsEditor options={sampleOptions} onChange={onChange} />);
    const removeButtons = screen.getAllByRole('button', { name: 'x' });
    await userEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([sampleOptions[1]]);
  });
});
