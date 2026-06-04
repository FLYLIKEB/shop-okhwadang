import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NavigationPreview from '@/components/shared/admin/navigation/NavigationPreview';
import type { NavigationItem } from '@/lib/api';

const gnbItems: NavigationItem[] = [
  {
    id: 1,
    group: 'gnb',
    label: '상품',
    labelEn: 'Products',
    url: '/products',
    sort_order: 0,
    is_active: true,
    parent_id: null,
    children: [
      {
        id: 2,
        group: 'gnb',
        label: '자사호',
        labelEn: 'Teapots',
        url: '/products?categoryId=1',
        sort_order: 0,
        is_active: true,
        parent_id: 1,
        children: [],
      },
    ],
  },
];

describe('NavigationPreview', () => {
  it('GNB 헤더 드롭다운 하위 카테고리에 ㄴ 모양 장식을 렌더링하지 않는다', () => {
    render(<NavigationPreview group="gnb" items={gnbItems} />);

    fireEvent.mouseEnter(screen.getByText('상품').closest('div')!);

    expect(screen.getByText('자사호')).toBeInTheDocument();
    expect(screen.queryByText('└')).not.toBeInTheDocument();
  });
});
