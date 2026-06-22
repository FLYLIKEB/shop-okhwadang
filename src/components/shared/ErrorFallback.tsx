'use client';

import { handleApiError } from '@/utils/error';
import { localMessage } from '@/utils/localMessages';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  onRetry: () => void;
}

export default function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
          <p className="text-sm text-red-600 mb-2">{localMessage('ui.dataLoadError')}</p>
          <p className="text-xs text-red-500/70">{handleApiError(error, localMessage('ui.unknownError'))}</p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-sm font-medium bg-foreground text-background rounded px-6 py-3 hover:opacity-80 transition-opacity"
        >
          {localMessage('ui.retry')}
        </button>
      </div>
    </div>
  );
}
