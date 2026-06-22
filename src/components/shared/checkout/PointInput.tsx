'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { couponsApi } from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';
import { cn } from '@/components/ui/utils';

interface PointInputProps {
  onPointsChange: (points: number) => void;
}

export default function PointInput({ onPointsChange }: PointInputProps) {
  const t = useTranslations('points');
  const locale = useLocale() as Locale;
  const [balance, setBalance] = useState(0);
  const [value, setValue] = useState('');

  const { execute: loadPoints, isLoading: loading } = useAsyncAction(
    async () => {
      const res = await couponsApi.getPoints();
      setBalance(res.balance);
    },
    { onError: () => setBalance(0), errorMessage: t('loadError') },
  );

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Math.min(Number(raw), balance);
    setValue(raw === '' ? '' : String(num));
    onPointsChange(num);
  };

  const handleUseAll = () => {
    setValue(String(balance));
    onPointsChange(balance);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="point-input" className="text-sm font-medium">
          {t('label')}
        </label>
        <span className="text-xs text-muted-foreground">
          {t('balance', { amount: formatCurrency(balance, locale) })}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          id="point-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={t('placeholder')}
          disabled={balance === 0}
          className={cn(
            'flex-1 rounded-md border px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            balance === 0 && 'opacity-50 cursor-not-allowed',
          )}
        />
        <button
          type="button"
          onClick={handleUseAll}
          disabled={balance === 0}
          className={cn(
            'rounded-md border px-3 py-2 text-sm font-medium',
            'hover:bg-muted transition-colors',
            balance === 0 && 'opacity-50 cursor-not-allowed',
          )}
        >
          {t('useAll')}
        </button>
      </div>
      {balance === 0 && (
        <p className="text-xs text-muted-foreground">{t('empty')}</p>
      )}
    </div>
  );
}
