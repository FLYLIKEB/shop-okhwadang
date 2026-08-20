import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AddressSelectorSection } from '@/components/shared/checkout/AddressSelectorSection';
import type { UserAddress } from '@/lib/api';

const sampleAddresses: UserAddress[] = [
  {
    id: 1,
    userId: 10,
    recipientName: '홍길동',
    phone: '010-1111-2222',
    zipcode: '06234',
    address: '서울 강남구 테헤란로 123',
    addressDetail: '101호',
    label: '집',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    userId: 10,
    recipientName: '홍길동',
    phone: '010-3333-4444',
    zipcode: '03187',
    address: '서울 종로구 종로 1',
    addressDetail: null,
    label: '회사',
    isDefault: false,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('AddressSelectorSection', () => {
  it('addressLoading=true → 로딩 메시지', () => {
    render(
      <AddressSelectorSection
        addresses={[]}
        selectedAddressId={null}
        addressLoading={true}
        onSelect={vi.fn()}
        locale="ko"
      />,
    );
    expect(screen.getByText('주소 불러오는 중...')).toBeInTheDocument();
  });

  it('addresses=[] → 배송지 추가 안내 + 버튼', () => {
    render(
      <AddressSelectorSection
        addresses={[]}
        selectedAddressId={null}
        addressLoading={false}
        onSelect={vi.fn()}
        locale="ko"
      />,
    );
    expect(screen.getByText('저장된 배송지가 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배송지 추가' })).toBeInTheDocument();
  });

  it('addresses 있으면 라디오 + 직접 입력 옵션 렌더', () => {
    render(
      <AddressSelectorSection
        addresses={sampleAddresses}
        selectedAddressId={1}
        addressLoading={false}
        onSelect={vi.fn()}
        locale="ko"
      />,
    );
    expect(screen.getByRole('button', { name: '배송지 변경' })).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('집')).toBeInTheDocument();
    expect(screen.queryByText('회사')).not.toBeInTheDocument();
    expect(screen.queryByText('직접 입력')).not.toBeInTheDocument();
  });

  it('selectedAddressId=1 → 첫 번째 주소 라디오 checked', () => {
    render(
      <AddressSelectorSection
        addresses={sampleAddresses}
        selectedAddressId={1}
        addressLoading={false}
        onSelect={vi.fn()}
        locale="ko"
      />,
    );
    expect(screen.getByRole('button', { name: '배송지 변경' })).toBeInTheDocument();
  });

  it('selectedAddressId=manual → 직접 입력 라디오 checked', () => {
    render(
      <AddressSelectorSection
        addresses={sampleAddresses}
        selectedAddressId="manual"
        addressLoading={false}
        onSelect={vi.fn()}
        locale="ko"
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getAllByRole('radio')[2]).toBeChecked();
  });

  it('주소 라디오 클릭 → onSelect(id) 호출', async () => {
    const onSelect = vi.fn();
    render(
      <AddressSelectorSection
        addresses={sampleAddresses}
        selectedAddressId={1}
        addressLoading={false}
        onSelect={onSelect}
        locale="ko"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '배송지 변경' }));
    await userEvent.click(screen.getAllByRole('radio')[1]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('직접 입력 클릭 → onSelect("manual") 호출', async () => {
    const onSelect = vi.fn();
    render(
      <AddressSelectorSection
        addresses={sampleAddresses}
        selectedAddressId={1}
        addressLoading={false}
        onSelect={onSelect}
        locale="ko"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '배송지 변경' }));
    await userEvent.click(screen.getAllByRole('radio')[2]);
    expect(onSelect).toHaveBeenCalledWith('manual');
  });
});
