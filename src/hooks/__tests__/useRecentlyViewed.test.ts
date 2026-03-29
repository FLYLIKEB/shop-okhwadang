import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

beforeEach(() => {
  localStorage.clear();
});

const makeProduct = (id: number) => ({
  id,
  name: `Product ${id}`,
  price: 10000 * id,
  salePrice: null,
  thumbnail: null,
  slug: `product-${id}`,
});

describe('useRecentlyViewed', () => {
  it('상품 추가 시 localStorage에 저장', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      result.current.addItem(makeProduct(1));
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(1);
    const stored = JSON.parse(localStorage.getItem('recently_viewed') ?? '[]') as { id: number }[];
    expect(stored[0].id).toBe(1);
  });

  it('동일 상품 재추가 시 중복 제거 후 맨 앞으로', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      result.current.addItem(makeProduct(1));
      result.current.addItem(makeProduct(2));
      result.current.addItem(makeProduct(1));
    });
    expect(result.current.items.filter((p) => p.id === 1)).toHaveLength(1);
    expect(result.current.items[0].id).toBe(1);
  });

  it('최대 20개 초과 시 오래된 항목 제거', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      for (let i = 1; i <= 25; i++) {
        result.current.addItem(makeProduct(i));
      }
    });
    expect(result.current.items).toHaveLength(20);
    expect(result.current.items[0].id).toBe(25);
  });

  it('전체 삭제 시 localStorage 비움', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      result.current.addItem(makeProduct(1));
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
    expect(localStorage.getItem('recently_viewed')).toBeNull();
  });
});
