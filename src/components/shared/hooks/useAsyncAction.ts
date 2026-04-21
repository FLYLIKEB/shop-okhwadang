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

  const execute = useCallback(async (arg: A) => {
    setIsLoading(true);
    startLoading();
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
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return { execute, isLoading };
}
