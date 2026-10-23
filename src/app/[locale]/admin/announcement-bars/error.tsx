'use client';

import { localMessage } from '@/utils/localMessages';
export default function ErrorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-xl font-semibold">{localMessage('adminEnglish.unableToLoadTheAnnouncementBarPage')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{localMessage('product.loadErrorDescription')}</p>
    </div>
  );
}
