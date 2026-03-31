'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import CartItemRow from '@/components/cart/CartItemRow';
import { formatPrice } from '@/utils/price';
import { SkeletonBox } from '@/components/ui/Skeleton';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, isLoading, updateQuantity, removeItem } = useCart();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const selectedTotal = useMemo(
    () =>
      items
        .filter((item) => selectedIds.has(item.id))
        .reduce((sum, item) => sum + item.subtotal, 0),
    [items, selectedIds],
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRemove = async (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await removeItem(id);
  };

  const handleOrder = () => {
    if (selectedIds.size === 0) {
      toast.warning('주문할 상품을 선택해주세요.');
      return;
    }
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    sessionStorage.setItem('checkoutItems', JSON.stringify(selectedItems));
    router.push('/checkout');
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyState
          title="로그인이 필요합니다"
          description="장바구니를 이용하려면 로그인해주세요."
          action={{ label: '로그인', onClick: () => router.push('/login') }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} height="h-24" />
            ))}
          </div>
          <SkeletonBox height="h-48" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyState
          title="장바구니가 비었습니다"
          description="마음에 드는 상품을 장바구니에 담아보세요."
          action={{ label: '쇼핑 계속하기', onClick: () => router.push('/products') }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">장바구니</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Item list */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between border-b pb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label="전체 선택"
                className="h-4 w-4 rounded border-input accent-foreground"
              />
              전체 선택 ({selectedIds.size}/{items.length})
            </label>
          </div>

          <div>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                onQuantityChange={updateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="h-fit rounded-lg border p-6 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg">주문 요약</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">선택 상품</span>
              <span>{selectedIds.size}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">상품 금액</span>
              <span>{formatPrice(selectedTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span>{selectedTotal >= 30000 ? '무료' : '3,000원'}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-bold">
              <span>합계</span>
              <span>
                {formatPrice(
                  selectedTotal +
                  (selectedTotal >= 30000 || selectedTotal === 0 ? 0 : 3000)
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOrder}
            className="w-full rounded-md bg-foreground py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            선택 상품 주문하기
          </button>
        </div>
      </div>
    </div>
  );
}
