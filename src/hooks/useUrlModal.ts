'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type HistoryMode = 'auto' | 'push' | 'replace';

const URL_STATE_EVENT = 'okhwadang:url-state-change';

function getCurrentValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get(key);
}

function buildUrl(key: string, nextValue: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (nextValue === null) {
    params.delete(key);
  } else {
    params.set(key, nextValue);
  }

  const query = params.toString();
  const hash = window.location.hash;
  return `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;
}

function applyHistory(key: string, nextValue: string | null, mode: 'push' | 'replace'): void {
  const url = buildUrl(key, nextValue);
  if (mode === 'push') {
    window.history.pushState(window.history.state, '', url);
  } else {
    window.history.replaceState(window.history.state, '', url);
  }
  window.dispatchEvent(new Event(URL_STATE_EVENT));
}

export function useUrlQueryState(key: string) {
  const [value, setValueState] = useState<string | null>(null);
  const openedInSessionRef = useRef(false);

  useEffect(() => {
    const sync = () => setValueState(getCurrentValue(key));
    sync();

    window.addEventListener('popstate', sync);
    window.addEventListener(URL_STATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(URL_STATE_EVENT, sync);
    };
  }, [key]);

  const setValue = useCallback((nextValue: string | null, history: HistoryMode = 'auto') => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentValue = getCurrentValue(key);
    if (currentValue === nextValue) {
      return;
    }

    if (nextValue === null) {
      if (history === 'replace' || !openedInSessionRef.current) {
        applyHistory(key, null, 'replace');
        return;
      }

      openedInSessionRef.current = false;
      window.history.back();
      return;
    }

    if (history === 'replace') {
      applyHistory(key, nextValue, 'replace');
      return;
    }

    openedInSessionRef.current = true;
    applyHistory(key, nextValue, 'push');
  }, [key]);

  const close = useCallback((history: Exclude<HistoryMode, 'push'> = 'auto') => {
    setValue(null, history);
  }, [setValue]);

  return {
    value,
    setValue,
    close,
  };
}

export function useUrlModal(key: string) {
  const { value, setValue, close } = useUrlQueryState(key);
  const isOpen = value === '1';

  const setOpen = useCallback((open: boolean, history: HistoryMode = 'auto') => {
    setValue(open ? '1' : null, history);
  }, [setValue]);

  return [isOpen, setOpen, close] as const;
}
