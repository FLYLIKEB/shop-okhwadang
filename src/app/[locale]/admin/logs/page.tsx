'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { adminLogsApi, type AdminLogResponse, type AdminLogType } from '@/lib/api';
import {
  getAdminLogField,
  parseAdminLogContent,
  type ParsedAdminLogEntry,
} from '@/lib/admin-log-format';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { handleApiError } from '@/utils/error';
import { cn } from '@/components/ui/utils';

const LOG_TYPES: AdminLogType[] = ['normal', 'error'];
const LINE_OPTIONS = [100, 500, 1000, 3000, 5000];
const TIME_PRESETS = ['1h', '24h', '7d'] as const;

interface AppliedLogFilters {
  search: string;
  startAt: string;
  endAt: string;
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function AdminLogsPage() {
  const t = useTranslations('admin.logs');
  const { user, isAdmin } = useAdminGuard();
  const [type, setType] = useState<AdminLogType>('normal');
  const [lines, setLines] = useState(500);
  const [search, setSearch] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedLogFilters>({
    search: '',
    startAt: '',
    endAt: '',
  });
  const [data, setData] = useState<AdminLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchLogs, isLoading } = useAsyncAction(
    async () => {
      setError(null);
      const result = await adminLogsApi.get({
        type,
        lines,
        search: appliedFilters.search.trim() || undefined,
        startAt: toIsoOrUndefined(appliedFilters.startAt),
        endAt: toIsoOrUndefined(appliedFilters.endAt),
      });
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
  }, [fetchLogs, isAdmin, type, lines, appliedFilters, user?.role]);

  const parsedEntries = useMemo(() => parseAdminLogContent(data?.content ?? ''), [data?.content]);
  const hasFilters = appliedFilters.search || appliedFilters.startAt || appliedFilters.endAt;

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

  const applyFilters = () => {
    setAppliedFilters({ search, startAt, endAt });
  };

  const clearFilters = () => {
    setSearch('');
    setStartAt('');
    setEndAt('');
    setAppliedFilters({ search: '', startAt: '', endAt: '' });
  };

  const applyTimePreset = (preset: (typeof TIME_PRESETS)[number]) => {
    const now = new Date();
    const start = new Date(now);
    if (preset === '1h') start.setHours(now.getHours() - 1);
    if (preset === '24h') start.setDate(now.getDate() - 1);
    if (preset === '7d') start.setDate(now.getDate() - 7);
    setStartAt(toDateTimeLocalValue(start));
    setEndAt(toDateTimeLocalValue(now));
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

      <section className="surface-card p-4">
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

      <section className="surface-card p-4">
        <div className="grid gap-4 lg:grid-cols-4 lg:items-end">
          <label className="grid gap-2 typo-body-sm font-medium">
            {t('filters.search')}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="rounded-md border bg-background px-3 py-2 typo-body-sm"
            />
          </label>
          <label className="grid gap-2 typo-body-sm font-medium">
            {t('filters.startAt')}
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 typo-body-sm"
            />
          </label>
          <label className="grid gap-2 typo-body-sm font-medium">
            {t('filters.endAt')}
            <input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 typo-body-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground"
            >
              <Search className="h-4 w-4" />
              {t('filters.apply')}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters && !search && !startAt && !endAt}
              className="rounded-md border px-4 py-2 typo-button text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('filters.clear')}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 typo-label text-muted-foreground">
          <span>{t('filters.presets')}</span>
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyTimePreset(preset)}
              className="rounded border px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(`filters.presetOptions.${preset}`)}
            </button>
          ))}
          {hasFilters && <span>{t('filters.applied')}</span>}
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
        {isLoading && !data ? (
          <div className="h-96 bg-foreground p-4 font-mono typo-label text-background">
            {t('loading')}
          </div>
        ) : (
          <LogTable entries={parsedEntries} emptyText={t('empty')} />
        )}
      </section>
    </div>
  );
}

function levelClassName(level: string | undefined): string {
  switch (level) {
    case 'error':
    case 'fatal':
      return 'border-destructive/40 bg-destructive/5 text-destructive';
    case 'warn':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    default:
      return 'border-border bg-background text-foreground';
  }
}

function LogTable({ entries, emptyText }: { entries: ParsedAdminLogEntry[]; emptyText: string }) {
  const t = useTranslations('admin.logs');

  if (entries.length === 0) {
    return <div className="p-8 text-center typo-body-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="max-h-screen overflow-auto">
      <table className="min-w-full divide-y divide-border typo-body-sm">
        <thead className="sticky top-0 z-10 bg-muted text-left typo-label text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.line')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.time')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.level')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.transaction')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.ip')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.request')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.message')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.context')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {t('table.details')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {entries.map((entry) => (
            <LogTableRow key={`${entry.lineNumber}-${entry.raw.slice(0, 24)}`} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogTableRow({ entry }: { entry: ParsedAdminLogEntry }) {
  const t = useTranslations('admin.logs');
  const transaction = getAdminLogField(entry, ['txId', 'transactionId', 'requestId', 'traceId']);
  const ip = getAdminLogField(entry, ['ip', 'clientIp', 'remoteAddress']);
  const request = [getAdminLogField(entry, ['method']), getAdminLogField(entry, ['path'])]
    .filter(Boolean)
    .join(' ');
  const message = getAdminLogField(entry, ['msg', 'message', 'error']) || entry.summary;
  const context = getAdminLogField(entry, ['context', 'service', 'event']);

  return (
    <tr className="align-top transition-colors hover:bg-muted/40">
      <td className="whitespace-nowrap px-3 py-3 typo-label text-muted-foreground">
        {t('entry.lineNumber', { number: entry.lineNumber })}
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-mono typo-label">{entry.timestamp || '-'}</td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-flex rounded border px-2 py-1 typo-label uppercase',
            levelClassName(entry.level),
          )}
        >
          {entry.level || (entry.parsed ? '-' : t('entry.raw'))}
        </span>
      </td>
      <td className="max-w-xs break-words px-3 py-3 font-mono typo-label">{transaction || '-'}</td>
      <td className="whitespace-nowrap px-3 py-3 font-mono typo-label">{ip || '-'}</td>
      <td className="max-w-xs break-words px-3 py-3 font-mono typo-label">{request || '-'}</td>
      <td className="min-w-72 max-w-xl whitespace-pre-wrap break-words px-3 py-3">{message}</td>
      <td className="max-w-xs break-words px-3 py-3 typo-label text-muted-foreground">
        {context || '-'}
      </td>
      <td className="min-w-72 px-3 py-3">
        <details className="group">
          <summary className="cursor-pointer typo-label text-muted-foreground group-open:mb-2">
            {t('table.showDetails')}
          </summary>
          <pre className="whitespace-pre-wrap break-words rounded-md bg-foreground p-3 font-mono typo-label text-background">
            {entry.parsed
              ? JSON.stringify(
                  Object.fromEntries(entry.fields.map((field) => [field.key, field.value])),
                  null,
                  2,
                )
              : entry.raw}
          </pre>
        </details>
      </td>
    </tr>
  );
}
