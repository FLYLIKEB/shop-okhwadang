import Link from 'next/link';
import type { Category } from '@/lib/api';

const CATEGORY_ICONS: Record<string, string> = {
  top: '👕',
  bottom: '👖',
  outer: '🧥',
  shoes: '👟',
  bag: '👜',
  accessory: '💍',
  dress: '👗',
  sports: '⚽',
};

function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? '🛍️';
}

interface CategoryNavProps {
  categories: Category[];
  isLoading?: boolean;
}

function SkeletonItem() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function CategoryNav({ categories, isLoading = false }: CategoryNavProps) {
  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">카테고리</h2>
      <div className="flex gap-6 overflow-x-auto pb-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)
          : categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-foreground transition-all">
                  <span className="text-2xl select-none">{getCategoryIcon(cat.slug)}</span>
                </div>
                <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}
