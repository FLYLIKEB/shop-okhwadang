import Link from 'next/link';
import type { Category } from '@/lib/api';

interface CategoryNavProps {
  categories: Category[];
  isLoading?: boolean;
}

function SkeletonItem() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function CategoryNav({ categories, isLoading = false }: CategoryNavProps) {
  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="border-y border-border py-6">
      <div className="flex gap-8 overflow-x-auto pb-2 justify-center">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)
          : categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {cat.name}
              </Link>
            ))}
      </div>
    </section>
  );
}
