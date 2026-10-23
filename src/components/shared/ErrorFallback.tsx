'use client';

import { HOME_PAGE_CONTENT_ERROR_CODE, isHomePageContentError } from '@/lib/storefront-diagnostics';
import { handleApiError } from '@/utils/error';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

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
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-6 mb-6">
          <p className="text-sm font-medium text-red-700 dark:text-red-200 mb-2">
            {diagnostic?.title ?? localMessage('ui.dataLoadError')}
          </p>
          {diagnostic ? (
            <>
              <p className="text-sm text-red-700/90 dark:text-red-200/90 mb-1">{diagnostic.description}</p>
              <p className="text-xs text-red-600 dark:text-red-200 mb-2">{diagnostic.recoveryHint}</p>
            </>
          ) : null}
          <p className="text-xs text-red-500/70 dark:text-red-200/70">{detailMessage}</p>
        </div>
        <Button
          variant="black"
          onClick={onRetry}
        >
          {localMessage('ui.retry')}
        </Button>
      </div>
    </div>
  );
}
