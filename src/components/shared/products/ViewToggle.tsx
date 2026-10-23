'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LOCAL_KEYS } from '@/constants/storage';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

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
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('grid')}
        aria-pressed={current === 'grid'}
        onClick={() => handleChange('grid')}
        className={cn('h-11 w-11 border-b hover:bg-transparent', current === 'grid' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('list')}
        aria-pressed={current === 'list'}
        onClick={() => handleChange('list')}
        className={cn('h-11 w-11 border-b hover:bg-transparent', current === 'list' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
