import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DesktopNav } from '@/components/header/DesktopNav';
import type { NavigationItem } from '@/lib/api';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const navItems: NavigationItem[] = [
  {
    id: 1,
    group: 'gnb',
    label: '보이차·다구',
    labelEn: 'Tea and Ware',
    url: '/products',
    sort_order: 0,
    is_active: true,
    parent_id: null,
    children: [
      {
        id: 2,
        group: 'gnb',
        label: 'ㄴ 보이차',
        labelEn: 'Pu-erh Tea',
        url: '/products?categoryId=2',
        sort_order: 0,
        is_active: true,
        parent_id: 1,
        children: [
          {
            id: 3,
            group: 'gnb',
            label: 'ㄴ 생차',
            labelEn: 'Raw Pu-erh',
            url: '/products?categoryId=3',
            sort_order: 0,
            is_active: true,
            parent_id: 2,
            children: [],
          },
        ],
      },
    ],
  },
];

describe('DesktopNav', () => {
  it('헤더 드롭다운 카테고리 라벨에서 선행 ㄴ 장식을 숨긴다', () => {
    const { container } = render(<DesktopNav items={navItems} />);

    fireEvent.mouseEnter(screen.getByText('보이차·다구').closest('div')!);

    expect(screen.getByRole('link', { name: '보이차' })).toHaveAttribute('href', '/products?categoryId=2');
    expect(screen.getByRole('link', { name: '생차' })).toHaveAttribute('href', '/products?categoryId=3');
    expect(screen.queryByText('ㄴ 보이차')).not.toBeInTheDocument();
    expect(screen.queryByText('ㄴ 생차')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('border-divider-soft');
  });
});
