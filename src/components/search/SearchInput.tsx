'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { searchApi } from '@/lib/api';

interface SearchInputProps {
  className?: string;
  placeholder?: string;
}

export default function SearchInput({ className, placeholder = '상품 검색...' }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [popularKeywords, setPopularKeywords] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, isLoading } = useAutocomplete(value);
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  useEffect(() => {
    searchApi.getPopular()
      .then((data) => setPopularKeywords(data.keywords))
      .catch(() => setPopularKeywords([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      addSearch(trimmed);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [value, addSearch, router],
  );

  const handleSelectItem = useCallback(
    (name: string) => {
      addSearch(name);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(name)}`);
    },
    [addSearch, router],
  );

  const showAutocomplete = isOpen && value.length >= 2 && (suggestions.length > 0 || isLoading);
  const showRecent = isOpen && value.length < 2 && recentSearches.length > 0;
  const showPopular = isOpen && value.length < 2 && popularKeywords.length > 0;
  const showDropdown = showAutocomplete || showRecent || showPopular;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label="상품 검색"
          className={cn(
            'w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-white shadow-lg">
          {showAutocomplete && (
            <div>
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">검색 중...</div>
              ) : (
                <ul role="listbox" aria-label="자동완성 결과">
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item.name)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                      >
                        <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showRecent && (
            <div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">최근 검색어</span>
                <button
                  type="button"
                  onClick={clearSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  전체 삭제
                </button>
              </div>
              <ul role="listbox" aria-label="최근 검색어">
                {recentSearches.map((term) => (
                  <li key={term} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleSelectItem(term)}
                      className="flex flex-1 items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSearch(term)}
                      aria-label={`${term} 삭제`}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showPopular && (
            <div>
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">인기 검색어</span>
              </div>
              <ul role="listbox" aria-label="인기 검색어">
                {popularKeywords.map((keyword, index) => (
                  <li key={keyword}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(keyword)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                    >
                      <TrendingUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="mr-1 text-xs font-medium text-primary">{index + 1}</span>
                      {keyword}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
