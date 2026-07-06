import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAttributesPage from '../page';

const mockUseAdminGuard = vi.fn();
const mockGetTypes = vi.fn();
const mockCreateType = vi.fn();
const mockUpdateType = vi.fn();
const mockDeleteType = vi.fn();
const mockGetTypeValueOptions = vi.fn();
const mockUpdateTypeValueOption = vi.fn();
const mockLinkProductToTypeValue = vi.fn();
const mockUnlinkProductFromTypeValue = vi.fn();
const mockGetProducts = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  productsApi: {
    getList: (...args: unknown[]) => mockGetProducts(...args),
  },
  attributesApi: {
    getTypes: (...args: unknown[]) => mockGetTypes(...args),
    createType: (...args: unknown[]) => mockCreateType(...args),
    updateType: (...args: unknown[]) => mockUpdateType(...args),
    deleteType: (...args: unknown[]) => mockDeleteType(...args),
    getTypeValueOptions: (...args: unknown[]) => mockGetTypeValueOptions(...args),
    updateTypeValueOption: (...args: unknown[]) => mockUpdateTypeValueOption(...args),
    linkProductToTypeValue: (...args: unknown[]) => mockLinkProductToTypeValue(...args),
    unlinkProductFromTypeValue: (...args: unknown[]) => mockUnlinkProductFromTypeValue(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const attributes = [
  {
    id: 1,
    code: 'clay_type',
    name: '니료',
    nameEn: 'Clay type',
    inputType: 'select' as const,
    parentId: null,
    relatedTypeIds: [2],
    validValues: ['zhuni', 'zini'],
    sortOrder: 1,
    isFilterable: true,
    isSearchable: false,
  },
  {
    id: 2,
    code: 'clay_origin',
    name: '산지',
    nameEn: 'Clay origin',
    inputType: 'text' as const,
    parentId: 1,
    relatedTypeIds: [],
    validValues: [],
    sortOrder: 2,
    isFilterable: false,
    isSearchable: true,
  },
];

describe('AdminAttributesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({ isAdmin: true });
    mockGetTypes.mockResolvedValue(attributes);
    mockCreateType.mockResolvedValue(attributes[0]);
    mockUpdateType.mockResolvedValue(attributes[1]);
    mockDeleteType.mockResolvedValue(undefined);
    mockGetProducts.mockResolvedValue({
      items: [
        { id: 10, name: '옥화당 녹니호', slug: 'nokni-pot', status: 'active', category: { name: '자사호' } },
        { id: 11, name: '옥화당 추가 상품', slug: 'extra-pot', status: 'active', category: { name: '자사호' } },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    mockGetTypeValueOptions.mockResolvedValue([
      {
        id: 1,
        value: 'nokni',
        displayValue: '녹니',
        sortOrder: 1,
        isActive: true,
        productCount: 1,
        products: [{ id: 10, name: '옥화당 녹니호', slug: 'nokni-pot' }],
      },
    ]);
    mockUpdateTypeValueOption.mockResolvedValue({
      id: 1,
      value: 'nokni',
      displayValue: '녹니 수정',
      sortOrder: 1,
      isActive: true,
      productCount: 1,
      products: [{ id: 10, name: '옥화당 녹니호', slug: 'nokni-pot' }],
    });
    mockLinkProductToTypeValue.mockResolvedValue({
      id: 1,
      value: 'nokni',
      displayValue: '녹니 수정',
      sortOrder: 1,
      isActive: true,
      productCount: 2,
      products: [
        { id: 10, name: '옥화당 녹니호', slug: 'nokni-pot' },
        { id: 11, name: '옥화당 추가 상품', slug: 'extra-pot' },
      ],
    });
    mockUnlinkProductFromTypeValue.mockResolvedValue({
      id: 1,
      value: 'nokni',
      displayValue: '녹니 수정',
      sortOrder: 1,
      isActive: true,
      productCount: 0,
      products: [],
    });
  });

  it('loads attributes and supports create, edit, and delete actions', async () => {
    render(<AdminAttributesPage />);

    expect(await screen.findByText('clay_type')).toBeInTheDocument();
    expect(screen.getByText('clay_origin')).toBeInTheDocument();

    fireEvent.click(screen.getByText('clay_type'));
    expect(await screen.findByDisplayValue('녹니')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('녹니'), { target: { value: '녹니 수정' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveValueOption' }));
    await waitFor(() => {
      expect(mockUpdateTypeValueOption).toHaveBeenCalledWith('clay_type', 'nokni', expect.objectContaining({ displayValue: '녹니 수정' }));
    });
    fireEvent.click(await screen.findByRole('button', { name: /옥화당 추가 상품/ }));
    await waitFor(() => {
      expect(mockLinkProductToTypeValue).toHaveBeenCalledWith('clay_type', 'nokni', 11);
    });
    fireEvent.click(screen.getByRole('button', { name: '선택 해제 옥화당 녹니호' }));
    await waitFor(() => {
      expect(mockUnlinkProductFromTypeValue).toHaveBeenCalledWith('clay_type', 'nokni', 10);
    });
    expect(screen.getByText('zhuni')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'removeValidValue' })[0]);
    expect(screen.queryByText('zhuni')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    fireEvent.change(screen.getByLabelText('code'), { target: { value: 'capacity' } });
    fireEvent.change(screen.getByLabelText('name'), { target: { value: '용량' } });
    fireEvent.change(screen.getByLabelText('nameEn'), { target: { value: 'Capacity' } });
    fireEvent.change(screen.getByLabelText('related'), { target: { value: '1, 2' } });
    fireEvent.change(screen.getByLabelText('validValues'), { target: { value: '100ml, 150ml' } });
    fireEvent.click(screen.getByRole('button', { name: 'addValidValue' }));
    fireEvent.click(screen.getByLabelText('filterable'));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mockCreateType).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'capacity',
          name: '용량',
          nameEn: 'Capacity',
          relatedTypeIds: [1, 2],
          validValues: ['100ml', '150ml'],
          isFilterable: true,
        }),
      );
    });

    fireEvent.click(screen.getByText('clay_origin'));
    fireEvent.change(screen.getByLabelText('name'), { target: { value: '원산지' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mockUpdateType).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ name: '원산지', parentId: 1 }),
      );
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);

    await waitFor(() => {
      expect(mockDeleteType).toHaveBeenCalledWith(1);
    });
  });
});
