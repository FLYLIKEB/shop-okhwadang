import { ORDER_STATUS_CONFIG, getTypedStatusConfig } from '@/constants/status';
import { useTranslations } from 'next-intl';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('order');
  const config = getTypedStatusConfig(ORDER_STATUS_CONFIG, status);
  const label = config && t.has(`status.${status}`) ? t(`status.${status}`) : status;
  const colorClass = config?.legacyClassName ?? 'bg-muted text-muted-foreground';

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
