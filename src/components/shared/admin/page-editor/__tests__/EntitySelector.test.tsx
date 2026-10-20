import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntitySelector from '../EntitySelector';

const mocks = vi.hoisted(() => ({ getList: vi.fn(), getById: vi.fn() }));
vi.mock('@/lib/api', () => ({ adminProductsApi: mocks, categoriesApi: { getTree: vi.fn().mockResolvedValue([]) } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}` }));

function Harness({ initial = [] }: { initial?: number[] }) {
  const [ids, setIds] = useState(initial);
  return <><EntitySelector type="product" selectedIds={ids} onChange={setIds} /><output>{ids.join(',')}</output></>;
}

describe('EntitySelector admin product access', () => {
  beforeEach(() => {
    mocks.getList.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    mocks.getById.mockReset().mockImplementation((id: number) => Promise.resolve({ id, name: `Selected ${id}`, status: 'draft' }));
  });

  it('searches and pages the administrator catalog beyond the first 100 products', async () => {
    mocks.getList.mockImplementation(({ page, q }: { page: number; q?: string }) => Promise.resolve({ items: [{ id: page === 6 || q ? 101 : page, name: q ? 'Hidden 101' : `Product ${page}`, status: 'hidden' }], total: q ? 1 : 121, page, limit: 20 }));
    render(<Harness />);
    await screen.findByText('Product 1');
    for (let page = 2; page <= 6; page += 1) {
      fireEvent.click(screen.getByText('next'));
      await waitFor(() => expect(mocks.getList).toHaveBeenLastCalledWith(expect.objectContaining({ page })));
      await screen.findByText(`Product ${page}`);
    }
    fireEvent.click(screen.getByText('Product 6'));
    expect(screen.getByRole('status')).toHaveTextContent('101');
    fireEvent.change(screen.getByPlaceholderText('productSearch'), { target: { value: 'Hidden' } });
    await waitFor(() => expect(mocks.getList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: 'Hidden' })));
  });

  it('hydrates hidden selected ids and keeps failed ids removable and correctly ordered', async () => {
    mocks.getById.mockImplementation((id: number) => id === 999 ? Promise.reject(new Error('missing')) : Promise.resolve({ id, name: `Selected ${id}`, status: 'draft' }));
    render(<Harness initial={[999, 101]} />);
    await screen.findByText('Selected 101');
    expect(screen.getByText('unavailable 999')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('selectedLoadError');
    fireEvent.click(screen.getByLabelText('moveUp Selected 101'));
    expect(screen.getByRole('status')).toHaveTextContent('101,999');
    fireEvent.click(screen.getByLabelText('remove unavailable 999'));
    expect(screen.getByRole('status')).toHaveTextContent('101');
    await act(async () => {});
  });

  it('shows list failure, retries and ignores an older search response', async () => {
    mocks.getList.mockRejectedValueOnce(new Error('offline'));
    render(<Harness initial={[101]} />);
    await screen.findByText('Selected 101');
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('retry'));
    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(2));
    let resolveOld!: (value: unknown) => void;
    mocks.getList.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ items: [{ id: 202, name: 'New result', status: 'draft' }], total: 1, page: 1, limit: 20 });
    fireEvent.change(screen.getByPlaceholderText('productSearch'), { target: { value: 'old' } });
    fireEvent.change(screen.getByPlaceholderText('productSearch'), { target: { value: 'new' } });
    await screen.findByText('New result');
    await act(async () => resolveOld({ items: [{ id: 201, name: 'Old result', status: 'active' }], total: 1, page: 1, limit: 20 }));
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('101');
  });
});
