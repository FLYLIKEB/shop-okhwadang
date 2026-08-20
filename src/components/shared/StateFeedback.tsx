import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/components/ui/utils';

type StateFeedbackVariant = 'storefront' | 'admin';
type StateFeedbackTone = 'empty' | 'loading' | 'error';

interface StateFeedbackProps {
  variant?: StateFeedbackVariant;
  tone?: StateFeedbackTone;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
  ariaLive?: 'off' | 'polite' | 'assertive';
}

const ROOT_CLASSES: Record<StateFeedbackVariant, string> = {
  storefront: 'flex flex-col items-center justify-center py-16 text-center',
  admin: 'rounded-lg border bg-card p-6 text-center',
};

const TONE_CLASSES: Record<StateFeedbackTone, string> = {
  empty: '',
  loading: '',
  error: 'border-destructive/30',
};

const ICON_WRAP_CLASSES: Record<StateFeedbackVariant, string> = {
  storefront: 'h-12 w-12 text-muted-foreground',
  admin: 'mx-auto mb-3 h-8 w-8 text-muted-foreground',
};

const TITLE_CLASSES: Record<StateFeedbackVariant, string> = {
  storefront: 'mt-4 typo-h3 font-medium text-foreground',
  admin: 'typo-body font-medium',
};

const DESCRIPTION_CLASSES: Record<StateFeedbackVariant, string> = {
  storefront: 'mt-2 typo-body-sm text-muted-foreground',
  admin: 'mt-1 typo-body-sm text-muted-foreground',
};

const ACTION_CLASSES: Record<StateFeedbackVariant, string> = {
  storefront: 'mt-6',
  admin: 'mt-4 flex justify-center',
};

function DefaultIcon({ tone, variant }: { tone: StateFeedbackTone; variant: StateFeedbackVariant }) {
  if (tone === 'loading') {
    return (
      <div
        className={cn(
          'rounded-full bg-muted animate-skeleton-shimmer',
          variant === 'storefront' ? 'h-full w-full' : 'h-12 w-12',
        )}
        aria-hidden="true"
      />
    );
  }

  const Icon = tone === 'error' ? AlertCircle : Inbox;

  return (
    <Icon
      className={cn('h-full w-full', tone === 'error' && 'text-destructive')}
      aria-hidden="true"
    />
  );
}

export function StateFeedback({
  variant = 'storefront',
  tone = 'empty',
  title,
  description,
  icon,
  action,
  className,
  role = tone === 'error' ? 'alert' : 'status',
  ariaLive = tone === 'loading' ? 'polite' : undefined,
}: StateFeedbackProps) {
  const hasIcon = icon !== null;

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn(ROOT_CLASSES[variant], TONE_CLASSES[tone], className)}
    >
      {hasIcon && (
        <div className={cn(ICON_WRAP_CLASSES[variant], tone === 'loading' && variant === 'admin' && 'mb-4 h-12 w-12')}>
          {icon ?? <DefaultIcon tone={tone} variant={variant} />}
        </div>
      )}
      <p className={TITLE_CLASSES[variant]}>{title}</p>
      {description && <p className={DESCRIPTION_CLASSES[variant]}>{description}</p>}
      {action && <div className={ACTION_CLASSES[variant]}>{action}</div>}
    </div>
  );
}
