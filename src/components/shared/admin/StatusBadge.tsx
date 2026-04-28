import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/components/ui/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
  {
    variants: {
      color: {
        green: 'border-emerald-200 bg-emerald-100/70 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
        red: 'border-red-200 bg-red-100/70 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200',
        yellow: 'border-amber-200 bg-amber-100/70 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
        secondary: 'border-border bg-muted/70 text-muted-foreground',
      },
    },
    defaultVariants: {
      color: 'secondary',
    },
  },
);

// ── isActive (기존 API) ──────────────────────────────────────────────────────

interface ActiveStatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  isActive: boolean;
  className?: string;
}

export function StatusBadge({ isActive, className }: ActiveStatusBadgeProps) {
  const active = isActive;
  return (
    <span className={cn(statusBadgeVariants({ color: active ? 'green' : 'red' }), className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-600' : 'bg-red-600')} />
      {active ? '활성' : '비활성'}
    </span>
  );
}

// ── Product status ───────────────────────────────────────────────────────────

type ProductStatus = 'active' | 'soldout' | 'draft' | 'hidden';

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: '판매중',
  soldout: '품절',
  draft: '임시저장',
  hidden: '숨김',
};

const PRODUCT_STATUS_COLORS: Record<ProductStatus, VariantProps<typeof statusBadgeVariants>['color']> = {
  active: 'green',
  soldout: 'red',
  draft: 'secondary',
  hidden: 'secondary',
};

interface ProductStatusBadgeProps {
  status: ProductStatus;
  className?: string;
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  const color = PRODUCT_STATUS_COLORS[status] ?? 'secondary';
  const label = PRODUCT_STATUS_LABELS[status] ?? status;
  return (
    <span className={cn(statusBadgeVariants({ color }), className)}>
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          color === 'green' && 'bg-emerald-600',
          color === 'red' && 'bg-red-600',
          color === 'yellow' && 'bg-amber-600',
          color === 'secondary' && 'bg-muted-foreground/70',
        )}
      />
      {label}
    </span>
  );
}

// ── Inquiry status ───────────────────────────────────────────────────────────

type InquiryStatus = 'answered' | 'pending';

interface InquiryStatusBadgeProps {
  status: InquiryStatus;
  /** 'admin': 미답변 | 'my': 접수 (default: 'admin') */
  context?: 'admin' | 'my';
  className?: string;
}

export function InquiryStatusBadge({ status, context = 'admin', className }: InquiryStatusBadgeProps) {
  const isAnswered = status === 'answered';
  const pendingLabel = context === 'my' ? '접수' : '미답변';
  return (
    <span className={cn(statusBadgeVariants({ color: isAnswered ? 'green' : 'yellow' }), className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', isAnswered ? 'bg-emerald-600' : 'bg-amber-600')} />
      {isAnswered ? '답변완료' : pendingLabel}
    </span>
  );
}

// ── Journal publish status (clickable toggle button) ─────────────────────────

interface JournalStatusBadgeProps {
  isPublished: boolean;
  onClick?: () => void;
  className?: string;
}

export function JournalStatusBadge({ isPublished, onClick, className }: JournalStatusBadgeProps) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        statusBadgeVariants({ color: isPublished ? 'green' : 'secondary' }),
        'rounded-full px-3 py-1',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
    >
      {isPublished ? '공개' : '비공개'}
    </Tag>
  );
}
