'use client';

import { HOME_PAGE_CONTENT_ERROR_CODE, isHomePageContentError } from '@/lib/storefront-diagnostics';
import { handleApiError } from '@/utils/error';
import { localMessage } from '@/utils/localMessages';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  onRetry: () => void;
}

export default function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const diagnostic = isHomePageContentError(error)
    ? {
        title: localMessage('ui.homeCmsMissingTitle'),
        description: localMessage('ui.homeCmsMissingDescription'),
        recoveryHint: localMessage('ui.homeCmsMissingRecoveryHint'),
      }
    : null;

  const homeCmsDetail = error.message || error.digest || HOME_PAGE_CONTENT_ERROR_CODE;
  const detailMessage = diagnostic
    ? homeCmsDetail
    : handleApiError(error, localMessage('ui.unknownError'));

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
          <p className="text-sm font-medium text-red-700 mb-2">
            {diagnostic?.title ?? localMessage('ui.dataLoadError')}
          </p>
          {diagnostic ? (
            <>
              <p className="text-sm text-red-700/90 mb-1">{diagnostic.description}</p>
              <p className="text-xs text-red-600 mb-2">{diagnostic.recoveryHint}</p>
            </>
          ) : null}
          <p className="text-xs text-red-500/70">{detailMessage}</p>
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
