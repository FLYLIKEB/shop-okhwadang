import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/components/ui/utils';
import {
  INQUIRY_STATUS_CONFIG,
  ORDER_STATUS_CONFIG,
  PRODUCT_STATUS_CONFIG,
  STATUS_BADGE_TONE_DOT_CLASSES,
  getTypedStatusConfig,
  type InquiryStatus,
  type OrderStatus,
  type ProductStatus,
  type StatusBadgeTone,
} from '@/constants/status';
import { localMessage } from '@/utils/localMessages';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
  {
    variants: {
      color: {
        green: 'border-emerald-200 bg-emerald-100/70 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
        red: 'border-red-200 bg-red-100/70 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200',
        yellow: 'border-amber-200 bg-amber-100/70 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
        blue: 'border-blue-200 bg-blue-100/70 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
        purple: 'border-purple-200 bg-purple-100/70 text-purple-800 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
        indigo: 'border-indigo-200 bg-indigo-100/70 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
        orange: 'border-orange-200 bg-orange-100/70 text-orange-800 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
        secondary: 'border-border bg-muted/70 text-muted-foreground',
      },
    },
    defaultVariants: {
      color: 'secondary',
    },
  },
);

type StatusBadgeColor = NonNullable<VariantProps<typeof statusBadgeVariants>['color']>;

function getToneColor(tone: StatusBadgeTone | null | undefined): StatusBadgeColor {
  return tone ?? 'secondary';
}

interface TypedStatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone | null;
  className?: string;
  dotClassName?: string;
}

export function TypedStatusBadge({ label, tone = 'secondary', className, dotClassName }: TypedStatusBadgeProps) {
  const color = getToneColor(tone);
  return (
    <span className={cn(statusBadgeVariants({ color }), className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_BADGE_TONE_DOT_CLASSES[color], dotClassName)} />
      {label}
    </span>
  );
}

// ── isActive (기존 API) ──────────────────────────────────────────────────────

interface ActiveStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function StatusBadge({ isActive, className }: ActiveStatusBadgeProps) {
  return (
    <TypedStatusBadge
      label={localMessage(`statusBadge.active.${isActive ? 'active' : 'inactive'}`)}
      tone={isActive ? 'green' : 'red'}
      className={className}
    />
  );
}


// ── Order status ─────────────────────────────────────────────────────────────

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = getTypedStatusConfig(ORDER_STATUS_CONFIG, status);
  return (
    <TypedStatusBadge
      label={config ? localMessage(config.labelKey) : status}
      tone={config?.tone ?? 'secondary'}
      className={className}
    />
  );
}

// ── Product status ───────────────────────────────────────────────────────────

interface ProductStatusBadgeProps {
  status: ProductStatus | string;
  className?: string;
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  const config = getTypedStatusConfig(PRODUCT_STATUS_CONFIG, status);
  return (
    <TypedStatusBadge
      label={config ? localMessage(config.labelKey) : status}
      tone={config?.tone ?? 'secondary'}
      className={className}
    />
  );
}

// ── Inquiry status ───────────────────────────────────────────────────────────

interface InquiryStatusBadgeProps {
  status: InquiryStatus | string;
  /** 'admin': 미답변 | 'my': 접수 (default: 'admin') */
  context?: 'admin' | 'my';
  className?: string;
}

export function InquiryStatusBadge({ status, context = 'admin', className }: InquiryStatusBadgeProps) {
  const config = getTypedStatusConfig(INQUIRY_STATUS_CONFIG, status);
  const labelKey = status === 'pending' && context === 'my' ? 'statusBadge.inquiry.pendingMy' : config?.labelKey;
  return (
    <TypedStatusBadge
      label={labelKey ? localMessage(labelKey) : status}
      tone={config?.tone ?? 'secondary'}
      className={className}
    />
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
  const color = getToneColor(isPublished ? 'green' : 'secondary');
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        statusBadgeVariants({ color }),
        'rounded-full px-3 py-1',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_BADGE_TONE_DOT_CLASSES[color])} />
      {localMessage(`statusBadge.journal.${isPublished ? 'published' : 'private'}`)}
    </Tag>
  );
}
