import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PriceRangeFilter from '@/components/filters/PriceRangeFilter';

describe('PriceRangeFilter', () => {
  it('renders min/max inputs', () => {
    render(<PriceRangeFilter onChange={vi.fn()} />);
    expect(screen.getByLabelText('최소 가격')).toBeInTheDocument();
    expect(screen.getByLabelText('최대 가격')).toBeInTheDocument();
  });

  it('renders 적용 button', () => {
    render(<PriceRangeFilter onChange={vi.fn()} />);
    expect(screen.getByText('적용')).toBeInTheDocument();
  });

  it('submit calls onChange with correct values', async () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('최소 가격'), '10000');
    await userEvent.type(screen.getByLabelText('최대 가격'), '50000');
    await userEvent.click(screen.getByText('적용'));

    expect(onChange).toHaveBeenCalledWith(10000, 50000);
  });

  it('min > max auto-swaps values', async () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('최소 가격'), '50000');
    await userEvent.type(screen.getByLabelText('최대 가격'), '10000');
    await userEvent.click(screen.getByText('적용'));

    expect(onChange).toHaveBeenCalledWith(10000, 50000);
  });

  it('calls onChange with undefined when inputs are empty', async () => {
    const onChange = vi.fn();
    render(<PriceRangeFilter onChange={onChange} />);
    await userEvent.click(screen.getByText('적용'));
    expect(onChange).toHaveBeenCalledWith(undefined, undefined);
  });

  it('displays current range when min and max are provided', () => {
    render(<PriceRangeFilter min={10000} max={50000} onChange={vi.fn()} />);
    expect(screen.getByText(/₩10,000/)).toBeInTheDocument();
    expect(screen.getByText(/₩50,000/)).toBeInTheDocument();
  });

  it('initializes inputs with provided min/max values', () => {
    render(<PriceRangeFilter min={10000} max={50000} onChange={vi.fn()} />);
    expect(screen.getByLabelText('최소 가격')).toHaveValue(10000);
    expect(screen.getByLabelText('최대 가격')).toHaveValue(50000);
  });
});
