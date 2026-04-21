import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/status';
import { useTranslations } from 'next-intl';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('order');
  const label = t.has(`status.${status}`) ? t(`status.${status}`) : (ORDER_STATUS_LABELS[status] ?? status);
  const colorClass = ORDER_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
