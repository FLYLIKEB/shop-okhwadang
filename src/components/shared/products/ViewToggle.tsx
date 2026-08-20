'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LOCAL_KEYS } from '@/constants/storage';
import { Button } from '@/components/ui/button';

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
      <Button
        type="button"
        variant={current === 'grid' ? 'black' : 'gray'}
        size="icon"
        aria-label={t('grid')}
        onClick={() => handleChange('grid')}
        className="h-9 min-h-9 w-9 rounded"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={current === 'list' ? 'black' : 'gray'}
        size="icon"
        aria-label={t('list')}
        onClick={() => handleChange('list')}
        className="h-9 min-h-9 w-9 rounded"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
