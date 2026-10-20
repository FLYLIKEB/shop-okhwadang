'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, X, Search, ChevronRight } from 'lucide-react';
import { categoriesApi, adminProductsApi } from '@/lib/api';
import type { Category, Product } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { useTranslations } from 'next-intl';
import { handleApiError } from '@/utils/error';

interface EntitySelectorProps {
  type: 'category' | 'product';
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  categoryId?: number;
  selectedItems?: SelectedEntityItem[];
}

interface EntityItem {
  id: number;
  label: string;
  sublabel?: string;
}

interface SelectedEntityItem {
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
  selectedItems = [],
}: EntitySelectorProps) {
  const t = useTranslations('admin.entitySelector');
  const [allItems, setAllItems] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [selectedError, setSelectedError] = useState('');
  const [hydratedItems, setHydratedItems] = useState<EntityItem[]>([]);
  const [retry, setRetry] = useState(0);
  const selectedKey = selectedIds.join(',');
  const loadErrorMessage = t('loadError');
  const selectedErrorMessage = t('selectedLoadError');

  useEffect(() => { setPage(1); }, [type, categoryId]);

  useEffect(() => {
    setSelectedError('');
    if (type !== 'product' || !selectedKey) return;
    let cancelled = false;
    Promise.allSettled(selectedKey.split(',').map((id) => adminProductsApi.getById(Number(id))))
      .then((results) => {
        if (cancelled) return;
        setHydratedItems(results.flatMap((result) => result.status === 'fulfilled'
          ? [{ id: result.value.id, label: result.value.name, sublabel: result.value.status }]
          : []));
        if (results.some((result) => result.status === 'rejected')) setSelectedError(selectedErrorMessage);
      });
    return () => { cancelled = true; };
  }, [type, selectedKey, retry, selectedErrorMessage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    async function fetchItems() {
      try {
        if (type === 'category') {
          const tree = await categoriesApi.getTree();
          if (!cancelled) setAllItems(flattenCategories(tree));
        } else {
          const res = await adminProductsApi.getList({ limit: 20, page, q: search || undefined, categoryId });
          if (!cancelled) {
            setTotalPages(Math.max(1, Math.ceil(res.total / res.limit)));
            setAllItems(
              res.items.map((p: Product) => ({
                id: p.id,
                label: p.name,
                sublabel: p.category ? `${p.category.name} · ${p.status}` : p.status,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) setError(handleApiError(err, loadErrorMessage));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchItems();
    return () => { cancelled = true; };
  }, [type, categoryId, page, search, retry, loadErrorMessage]);

  const selectedDisplayItems = useMemo(
    () => selectedIds
      .map((id) => allItems.find((item) => item.id === id)
        ?? selectedItems.find((item) => item.id === id)
        ?? hydratedItems.find((item) => item.id === id)
        ?? { id, label: t('unavailable', { id }) }),
    [selectedIds, allItems, selectedItems, hydratedItems, t],
  );

  const filteredAvailable = useMemo(() => {
    const q = search.toLowerCase();
    return allItems
      .filter((item) => !selectedIds.includes(item.id))
      .filter((item) => type === 'product' || item.label.toLowerCase().includes(q));
  }, [allItems, selectedIds, search, type]);

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
        {t(type)}
        <span className="ml-1 text-muted-foreground/60">{t('orderHint')}</span>
      </label>

      {/* Available items */}
      <div className="mb-2">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={placeholder ?? t(type === 'category' ? 'categorySearch' : 'productSearch')}
            className="w-full rounded border border-input py-1 pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="rounded border border-input bg-background max-h-40 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">{t('loading')}</div>
          ) : error ? (
            <div role="alert" className="px-3 py-2 text-xs text-destructive">
              {error}
              <button type="button" onClick={() => setRetry((value) => value + 1)}>{t('retry')}</button>
            </div>
          ) : filteredAvailable.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t(search ? 'emptySearch' : 'allSelected')}
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
        {type === 'product' && totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 py-1 text-xs">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>{t('previous')}</button>
            <span>{page} / {totalPages}</span>
            <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)}>{t('next')}</button>
          </div>
        )}
      </div>

      {/* Selected items */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('selected', { count: selectedIds.length })}</span>
        </div>
        {selectedError && <div role="alert" className="text-xs text-destructive">{selectedError}<button type="button" onClick={() => setRetry((value) => value + 1)}>{t('retry')}</button></div>}
        <div className="rounded border border-input bg-background max-h-48 overflow-y-auto">
          {selectedDisplayItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t('addHint')}
            </div>
          ) : (
            selectedDisplayItems.map((item, index) => (
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
                    aria-label={t('moveUp', { label: item.label })}
                    className={cn('p-0.5 rounded hover:bg-muted', index === 0 && 'opacity-30 cursor-not-allowed')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === selectedDisplayItems.length - 1}
                    aria-label={t('moveDown', { label: item.label })}
                    className={cn('p-0.5 rounded hover:bg-muted', index === selectedDisplayItems.length - 1 && 'opacity-30 cursor-not-allowed')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={t('remove', { label: item.label })}
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
