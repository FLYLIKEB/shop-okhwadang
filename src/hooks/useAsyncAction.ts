'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';

interface UseAsyncActionOptions {
  onSuccess?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncAction<T>(
  fn: () => Promise<T>,
  options: UseAsyncActionOptions = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const optRef = useRef(options);
  optRef.current = options;

  const execute = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fnRef.current();
      if (optRef.current.successMessage) {
        toast.success(optRef.current.successMessage);
      }
      optRef.current.onSuccess?.();
      return result;
    } catch (err) {
      const message = handleApiError(err, optRef.current.errorMessage ?? '오류가 발생했습니다.');
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading };
}
