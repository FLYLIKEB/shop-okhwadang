'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { adminLogsApi, type AdminLogResponse, type AdminLogType } from '@/lib/api';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { handleApiError } from '@/utils/error';
import { cn } from '@/components/ui/utils';

const LOG_TYPES: AdminLogType[] = ['normal', 'error'];
const LINE_OPTIONS = [100, 500, 1000, 3000, 5000];

function formatUpdatedAt(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export default function AdminLogsPage() {
  const t = useTranslations('admin.logs');
  const { user, isAdmin } = useAdminGuard();
  const [type, setType] = useState<AdminLogType>('normal');
  const [lines, setLines] = useState(500);
  const [data, setData] = useState<AdminLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchLogs, isLoading } = useAsyncAction(
    async () => {
      setError(null);
      const result = await adminLogsApi.get({ type, lines });
      setData(result);
    },
    {
      errorMessage: t('loadError'),
      onError: (err) => setError(handleApiError(err, t('loadError'))),
    },
  );

  useEffect(() => {
    if (!isAdmin || user?.role !== 'super_admin') return;
    void fetchLogs();
  }, [fetchLogs, isAdmin, type, lines, user?.role]);

  const logContent = useMemo(() => data?.content || t('empty'), [data?.content, t]);

  if (isAdmin && user?.role !== 'super_admin') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="typo-h2 font-semibold">{t('title')}</h1>
        <p className="mt-3 typo-body-sm text-muted-foreground">{t('superAdminOnly')}</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (!data?.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      toast.success(t('copySuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('copyError')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="typo-h2 font-semibold">{t('title')}</h1>
          <p className="mt-2 typo-body-sm text-muted-foreground">{t('description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLogs()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          {t('refresh')}
        </button>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {LOG_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  'rounded-md px-3 py-2 typo-button transition-colors',
                  type === item
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {t(`types.${item}`)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="admin-log-lines" className="typo-body-sm text-muted-foreground">
              {t('lineCount')}
            </label>
            <select
              id="admin-log-lines"
              value={lines}
              onChange={(event) => setLines(Number(event.target.value))}
              className="rounded-md border bg-background px-3 py-2 typo-body-sm"
            >
              {LINE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t('lineOption', { count: option })}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!data?.content}
              className="rounded-md border px-3 py-2 typo-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('copy')}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 typo-body-sm text-destructive">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b bg-muted/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="typo-body-sm font-medium">
            {data ? t('summary', { app: data.app, source: data.source }) : t('summaryPending')}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 typo-label text-muted-foreground">
            <span>{t('updatedAt', { value: formatUpdatedAt(data?.updatedAt ?? null) })}</span>
            <span>{t('loadedLines', { count: data?.lineCount ?? 0 })}</span>
            {data?.truncated && <span>{t('truncated')}</span>}
          </div>
        </div>
        <pre className="h-96 overflow-auto whitespace-pre-wrap bg-foreground p-4 font-mono typo-label leading-relaxed text-background">
          {isLoading && !data ? t('loading') : logContent}
        </pre>
      </section>
    </div>
  );
}
