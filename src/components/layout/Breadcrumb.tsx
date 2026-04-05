'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { Category } from '@/lib/api';

interface BreadcrumbProps {
  category?: Category | null;
}

export default function Breadcrumb({ category }: BreadcrumbProps) {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <nav aria-label="breadcrumb" className="py-3">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
            HOME
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
        </li>
        {category ? (
          <>
            <li>
              <Link href={`/${locale}/products`} className="hover:text-foreground transition-colors">
                상품목록
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li className="text-foreground font-medium">
              {category.name}
            </li>
          </>
        ) : (
          <li className="text-foreground font-medium">
            상품목록
          </li>
        )}
      </ol>
    </nav>
  );
}