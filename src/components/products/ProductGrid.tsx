'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/products/ProductCard';
import ProductListItem from '@/components/products/ProductListItem';
import ViewToggle from '@/components/products/ViewToggle';
import SortDropdown from '@/components/products/SortDropdown';
import { cn } from '@/components/ui/utils';
import type { Product } from '@/lib/api';

type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'products-view-mode';

interface ProductGridProps {
  products: Product[];
  total: number;
}

export default function ProductGrid({ products, total }: ProductGridProps) {
  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored === 'grid' || stored === 'list') {
      setView(stored);
    }
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-medium text-foreground">{total}</span>개 상품
        </p>
        <div className="flex items-center gap-2">
          <SortDropdown />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {view === 'grid' ? (
        <div className={cn('grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.salePrice}
              status={product.status}
              images={product.images}
              isFeatured={product.isFeatured}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              salePrice={product.salePrice}
              status={product.status}
              images={product.images}
              isFeatured={product.isFeatured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
