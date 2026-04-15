'use client';
import ErrorFallback from '@/components/shared/ErrorFallback';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback error={error} onRetry={reset} />;
}
