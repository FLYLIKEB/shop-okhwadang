'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const router = useRouter();
  const t = useTranslations('header');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push('/search?q=' + encodeURIComponent(trimmed));
    onClose();
  };

  return (
    <>
      {/* 배경 딤 */}
      <div
        className={cn(
          'fixed inset-0 z-[45] bg-black/10 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 검색 패널 — 헤더 바로 아래 페이드인 */}
      <div
        className={cn(
          'toss-header-search fixed left-0 right-0 z-[46] bg-background transition-[opacity,transform] duration-200 ease-in-out',
          isOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2',
        )}
        style={{ top: 'var(--header-bottom)' }}
        role="search"
        aria-label={t('searchLabel')}
        inert={!isOpen}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2 lg:px-8">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchShort')}
            aria-label={t('searchLabel')}
            className="h-11 min-w-0 flex-1 appearance-none border-0 border-b border-soft bg-transparent px-0 py-2 typo-body-sm text-foreground placeholder:text-muted-foreground focus:border-b-2 focus:border-foreground focus:outline-none"
          />
          <Button type="submit" variant="ghost" size="sm" className="h-11 px-2 typo-button font-normal text-foreground hover:bg-transparent">{t('searchText')}</Button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('searchClose')}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
