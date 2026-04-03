'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Collection page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
          <p className="text-sm text-red-600 mb-2">데이터를 불러오지 못했습니다</p>
          <p className="text-xs text-red-500/70">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm font-medium bg-foreground text-background rounded px-6 py-3 hover:opacity-80 transition-opacity"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
