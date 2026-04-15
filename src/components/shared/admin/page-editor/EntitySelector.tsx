'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, X, Search, ChevronRight } from 'lucide-react';
import { categoriesApi, productsApi } from '@/lib/api';
import type { Category, Product } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface EntitySelectorProps {
  type: 'category' | 'product';
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  categoryId?: number;
}

interface EntityItem {
  id: number;
  label: string;
  sublabel?: string;
}

function flattenCategories(categories: Category[], parentLabel = ''): EntityItem[] {
  const result: EntityItem[] = [];
  for (const cat of categories) {
    const label = parentLabel ? `${parentLabel} > ${cat.name}` : cat.name;
    result.push({ id: cat.id, label });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, label));
    }
  }
  return result;
}

export default function EntitySelector({
  type,
  selectedIds,
  onChange,
  placeholder,
  categoryId,
}: EntitySelectorProps) {
  const [allItems, setAllItems] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchItems() {
      try {
        if (type === 'category') {
          const tree = await categoriesApi.getTree();
          if (!cancelled) setAllItems(flattenCategories(tree));
        } else {
          const params: Record<string, number | string> = { limit: 100 };
          if (categoryId !== undefined) params.categoryId = categoryId;
          const res = await productsApi.getList(params);
          if (!cancelled) {
            setAllItems(
              res.items.map((p: Product) => ({
                id: p.id,
                label: p.name,
                sublabel: p.category ? `${p.category.name} · ${p.status}` : p.status,
              })),
            );
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchItems();
    return () => { cancelled = true; };
  }, [type, categoryId]);

  const selectedItems = useMemo(
    () => selectedIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean) as EntityItem[],
    [selectedIds, allItems],
  );

  const filteredAvailable = useMemo(() => {
    const q = search.toLowerCase();
    return allItems
      .filter((item) => !selectedIds.includes(item.id))
      .filter((item) => item.label.toLowerCase().includes(q));
  }, [allItems, selectedIds, search]);

  function addItem(id: number) {
    onChange([...selectedIds, id]);
  }

  function removeItem(id: number) {
    onChange(selectedIds.filter((i) => i !== id));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newIds = [...selectedIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    onChange(newIds);
  }

  function moveDown(index: number) {
    if (index === selectedIds.length - 1) return;
    const newIds = [...selectedIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    onChange(newIds);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {type === 'category' ? '카테고리' : '상품'} 선택
        <span className="ml-1 text-muted-foreground/60">(순서대로 표시)</span>
      </label>

      {/* Available items */}
      <div className="mb-2">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder ?? (type === 'category' ? '카테고리 검색...' : '상품 검색...')}
            className="w-full rounded border border-input py-1 pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="rounded border border-input bg-background max-h-40 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">로딩 중...</div>
          ) : filteredAvailable.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {search ? '검색 결과 없음' : '모든 항목이 선택됨'}
            </div>
          ) : (
            filteredAvailable.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addItem(item.id)}
                className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="ml-auto shrink-0 text-muted-foreground">{item.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected items */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">선택됨 ({selectedIds.length})</span>
        </div>
        <div className="rounded border border-input bg-background max-h-48 overflow-y-auto">
          {selectedItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              클릭으로 추가
            </div>
          ) : (
            selectedItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-1 border-b border-input last:border-b-0 px-2 py-1"
              >
                <span className="flex-1 truncate text-xs">{item.label}</span>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className={cn('p-0.5 rounded hover:bg-muted', index === 0 && 'opacity-30 cursor-not-allowed')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === selectedItems.length - 1}
                    className={cn('p-0.5 rounded hover:bg-muted', index === selectedItems.length - 1 && 'opacity-30 cursor-not-allowed')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-0.5 rounded text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
