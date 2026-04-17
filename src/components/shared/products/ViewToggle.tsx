'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { LOCAL_KEYS } from '@/constants/storage';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value?: ViewMode;
  onChange?: (mode: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  const t = useTranslations('product.view');
  const [mode, setMode] = useState<ViewMode>(value ?? 'grid');

  useEffect(() => {
    if (value === undefined) {
      const stored = localStorage.getItem(LOCAL_KEYS.VIEW_MODE) as ViewMode | null;
      if (stored === 'grid' || stored === 'list') {
        setMode(stored);
      }
    }
  }, [value]);

  const handleChange = (newMode: ViewMode) => {
    setMode(newMode);
    localStorage.setItem(LOCAL_KEYS.VIEW_MODE, newMode);
    onChange?.(newMode);
  };

  const current = value ?? mode;

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      <button
        type="button"
        aria-label={t('grid')}
        onClick={() => handleChange('grid')}
        className={cn(
          'rounded p-1.5 transition-colors',
          current === 'grid'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={t('list')}
        onClick={() => handleChange('list')}
        className={cn(
          'rounded p-1.5 transition-colors',
          current === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
