import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NavigationFormModal from './NavigationFormModal';
import type { NavigationItem } from '@/lib/api';

const initialItem: NavigationItem = {
  id: 2,
  group: 'gnb',
  label: '자사호',
  labelEn: 'JISAHO (Yixing Teapots)',
  url: '/products?categoryId=1',
  sort_order: 1,
  is_active: true,
  parent_id: null,
  children: [],
};

describe('NavigationFormModal', () => {
  it('수정 모달 입력값을 사용자가 바꿀 수 있다', async () => {
    const user = userEvent.setup();

    render(
      <NavigationFormModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initial={initialItem}
        group="gnb"
        flatItems={[initialItem]}
      />,
    );

    const labelInput = screen.getByLabelText(/^메뉴명/) as HTMLInputElement;
    const labelEnInput = screen.getByLabelText(/영문 메뉴명/) as HTMLInputElement;
    const urlInput = screen.getByLabelText(/URL/) as HTMLInputElement;

    await user.clear(labelInput);
    await user.type(labelInput, '보이차');
    await user.clear(labelEnInput);
    await user.type(labelEnInput, 'Boischa');
    await user.clear(urlInput);
    await user.type(urlInput, '/products?categoryId=2');

    expect(labelInput).toHaveValue('보이차');
    expect(labelEnInput).toHaveValue('Boischa');
    expect(urlInput).toHaveValue('/products?categoryId=2');
  });
});
