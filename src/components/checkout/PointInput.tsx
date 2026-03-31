'use client';

import { useEffect, useState } from 'react';
import { couponsApi } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/components/ui/utils';

interface PointInputProps {
  onPointsChange: (points: number) => void;
}

export default function PointInput({ onPointsChange }: PointInputProps) {
  const [balance, setBalance] = useState(0);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    couponsApi
      .getPoints()
      .then((res) => setBalance(res.balance))
      .catch(() => setBalance(0))
      .finally(() => setLoading(false));
  }, []);

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
    return <p className="text-sm text-muted-foreground">적립금 불러오는 중...</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="point-input" className="text-sm font-medium">
          적립금 사용
        </label>
        <span className="text-xs text-muted-foreground">
          보유 적립금: <strong>{formatCurrency(balance)}원</strong>
        </span>
      </div>
      <div className="flex gap-2">
        <input
          id="point-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="사용할 적립금 입력"
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
          전액 사용
        </button>
      </div>
      {balance === 0 && (
        <p className="text-xs text-muted-foreground">사용 가능한 적립금이 없습니다.</p>
      )}
    </div>
  );
}
