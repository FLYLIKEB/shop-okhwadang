'use client';

import ErrorFallback from '@/components/shared/ErrorFallback';
import { localMessage } from '@/utils/localMessages';
import { isHomeCmsIntegrityError } from './home-integrity';

function HomeCmsIntegrityFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-left shadow-sm">
        <div className="space-y-2">
          <p className="text-base font-semibold text-amber-950">
            {localMessage('home.integrityError.title')}
          </p>
          <p className="text-sm text-amber-900">
            {localMessage('home.integrityError.description')}
          </p>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950">
          <li>{localMessage('home.integrityError.checkPage')}</li>
          <li>{localMessage('home.integrityError.checkBlocks')}</li>
          <li>{localMessage('home.integrityError.checkSeed')}</li>
        </ul>
        <div className="mt-4 rounded-md bg-background/80 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {localMessage('home.integrityError.errorLabel')}
          </p>
          <p className="mt-1 break-words">{error.message}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          {localMessage('ui.retry')}
        </button>
      </div>
    </div>
  );
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  if (isHomeCmsIntegrityError(error)) {
    return <HomeCmsIntegrityFallback error={error} reset={reset} />;
  }

  return <ErrorFallback error={error} onRetry={reset} />;
}
