'use client';

import { localMessage } from '@/utils/localMessages';
export default function BusinessSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-destructive">{localMessage('adminEnglish.unableToLoadBusinessInformationSettings')}</p>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
      >
        {localMessage('popups.retry')}
      </button>
    </div>
  );
}
