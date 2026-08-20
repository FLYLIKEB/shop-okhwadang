'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useAutocomplete } from '@/components/shared/hooks/useAutocomplete';
import { useRecentSearches } from '@/components/shared/hooks/useRecentSearches';
import { useUrlModal } from '@/hooks/useUrlModal';
import { searchApi } from '@/lib/api';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  className?: string;
  placeholder?: string;
}

export default function SearchInput({ className, placeholder = '' }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useUrlModal('searchDropdown');
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
        setIsOpen(false, 'replace');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      addSearch(trimmed);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [value, addSearch, router, setIsOpen],
  );

  const handleSelectItem = useCallback(
    (name: string) => {
      addSearch(name);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(name)}`);
    },
    [addSearch, router, setIsOpen],
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
          id="search-input"
          name="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsOpen(true, isOpen ? 'replace' : 'push')}
          placeholder={placeholder}
          aria-label={localMessage('search.productSearch')}
          className={cn(
            'w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-background shadow-lg">
          {showAutocomplete && (
            <div>
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">{localMessage('search.searching')}</div>
              ) : (
                <ul role="listbox" aria-label={localMessage('search.autocompleteResults')}>
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <Button
                        type="button"
                        variant="gray"
                        size="sm"
                        onClick={() => handleSelectItem(item.name)}
                        className="w-full justify-start rounded-none px-4 py-2 text-sm"
                      >
                        <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {item.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showRecent && (
            <div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">{localMessage('search.recentSearches')}</span>
                <Button
                  type="button"
                  variant="gray"
                  size="sm"
                  onClick={clearSearches}
                  className="h-auto min-h-0 rounded-none px-1 py-0 text-xs"
                >
                  {localMessage('search.clearAll')}
                </Button>
              </div>
              <ul role="listbox" aria-label={localMessage('search.recentSearches')}>
                {recentSearches.map((term) => (
                  <li key={term} className="flex items-center">
                    <Button
                      type="button"
                      variant="gray"
                      size="sm"
                      onClick={() => handleSelectItem(term)}
                      className="flex-1 justify-start rounded-none px-4 py-2 text-sm"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {term}
                    </Button>
                    <Button
                      type="button"
                      variant="gray"
                      size="icon"
                      onClick={() => removeSearch(term)}
                      aria-label={localMessage('search.deleteTerm', { term })}
                      className="h-9 min-h-9 w-9 rounded-none px-3 py-2 text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showPopular && (
            <div>
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">{localMessage('search.popularSearches')}</span>
              </div>
              <ul role="listbox" aria-label={localMessage('search.popularSearches')}>
                {popularKeywords.map((keyword, index) => (
                  <li key={keyword}>
                    <Button
                      type="button"
                      variant="gray"
                      size="sm"
                      onClick={() => handleSelectItem(keyword)}
                      className="w-full justify-start rounded-none px-4 py-2 text-sm"
                    >
                      <TrendingUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="mr-1 text-xs font-medium text-primary">{index + 1}</span>
                      {keyword}
                    </Button>
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
