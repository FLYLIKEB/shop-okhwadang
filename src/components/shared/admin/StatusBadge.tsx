import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/components/ui/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      color: {
        green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        secondary: 'bg-secondary text-muted-foreground',
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
  return (
    <span className={cn(statusBadgeVariants({ color: isActive ? 'green' : 'red' }), className)}>
      {isActive ? '활성' : '비활성'}
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
