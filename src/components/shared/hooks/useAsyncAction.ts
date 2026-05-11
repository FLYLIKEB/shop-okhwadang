'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { useGlobalLoading } from '@/contexts/GlobalLoadingContext';

interface UseAsyncActionOptions {
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncAction<T, A = void>(
  fn: (arg: A) => Promise<T>,
  options: UseAsyncActionOptions = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const { startLoading, stopLoading } = useGlobalLoading();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const optRef = useRef(options);
  optRef.current = options;
  // 외부 컨텍스트(GlobalLoadingContext) 의 함수 reference 가 흔들려도 execute 가
  // 매 렌더 새 reference 가 되어 useEffect deps 무한 루프를 유발하지 않도록 ref 로 격리.
  const startLoadingRef = useRef(startLoading);
  startLoadingRef.current = startLoading;
  const stopLoadingRef = useRef(stopLoading);
  stopLoadingRef.current = stopLoading;

  const execute = useCallback(async (arg: A) => {
    setIsLoading(true);
    startLoadingRef.current();
    try {
      const result = await fnRef.current(arg);
      if (optRef.current.successMessage) {
        toast.success(optRef.current.successMessage);
      }
      optRef.current.onSuccess?.();
      return result;
    } catch (err) {
      const message = handleApiError(err, optRef.current.errorMessage ?? '오류가 발생했습니다.');
      toast.error(message);
      optRef.current.onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      stopLoadingRef.current();
    }
  }, []);

  return { execute, isLoading };
}
