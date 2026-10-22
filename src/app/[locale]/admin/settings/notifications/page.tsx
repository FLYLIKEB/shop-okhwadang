'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { adminNotificationTemplatesApi, type AlimtalkTemplateRevision, type NotificationTemplate, type NotificationTemplateContent } from '@/lib/api';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';

const identity = (template: NotificationTemplate) => `${template.channel}:${template.key}:${template.locale}`;
const contentOf = ({ subject, html, text, templateId }: NotificationTemplate): NotificationTemplateContent => ({ subject, html, text, templateId });

export default function NotificationTemplatesPage() {
  const t = useTranslations('admin.notificationTemplates');
  const { isAdmin } = useAdminGuard();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [draft, setDraft] = useState<NotificationTemplateContent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState<AlimtalkTemplateRevision | null>(null);
  const { execute: loadRevision } = useAsyncAction(async ({ record, accept }: { record: NotificationTemplate; accept: (revision: AlimtalkTemplateRevision) => void }) => {
    if (record.pendingTemplateId) accept(await adminNotificationTemplatesApi.getProvider(record, record.pendingTemplateId));
  }, { errorMessage: t('providerError') });
  useEffect(() => {
    if (!selected?.pendingTemplateId) return;
    let cancelled = false;
    setRevision({ templateId: selected.pendingTemplateId, content: '', status: 'UNKNOWN' });
    void loadRevision({ record: selected, accept: (result) => { if (!cancelled) setRevision(result); } });
    return () => { cancelled = true; };
  }, [selected, loadRevision]);
  const dirty = !!selected && !!draft && JSON.stringify(contentOf(selected)) !== JSON.stringify(draft);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!dirty) return;
    const protectNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.getAttribute('target') === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!window.confirm(t('discard'))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', protectNavigation, true);
    return () => document.removeEventListener('click', protectNavigation, true);
  }, [dirty, t]);

  const { execute: load, isLoading: loading } = useAsyncAction(async () => {
    setLoadFailed(false);
    const records = await adminNotificationTemplatesApi.getAll();
    setTemplates(records);
    setSelected(records[0] ?? null);
    setDraft(records[0] ? contentOf(records[0]) : null);
  }, { errorMessage: t('loadError'), onError: () => setLoadFailed(true) });

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const { execute: save, isLoading: saving } = useAsyncAction(async () => {
    if (!selected || !draft) return;
    const saved = await adminNotificationTemplatesApi.update(selected, draft);
    setTemplates((records) => records.map((record) => identity(record) === identity(saved) ? saved : record));
    setSelected(saved);
    setDraft(contentOf(saved));
    if (!saved.pendingTemplateId) setRevision(null);
  }, { successMessage: t('saved'), errorMessage: t('saveError') });

  const { execute: providerAction, isLoading: providerBusy } = useAsyncAction(async (action: 'create' | 'inspect' | 'refresh' | 'load') => {
    if (!selected || !draft) return;
    if (action === 'create') {
      const created = await adminNotificationTemplatesApi.createRevision(selected, draft);
      const updated = { ...selected, pendingTemplateId: created.templateId };
      setTemplates((records) => records.map((record) => identity(record) === identity(selected) ? updated : record));
      setSelected(updated);
      setRevision(created);
    } else if (action === 'load') {
      const remote = await adminNotificationTemplatesApi.getProvider(selected, draft.templateId);
      setDraft({ ...draft, text: remote.content.replace(/#\{([^}]+)\}/g, '{{$1}}') });
    } else if (revision) {
      setRevision(action === 'inspect'
        ? await adminNotificationTemplatesApi.requestInspection(selected, revision.templateId)
        : await adminNotificationTemplatesApi.getProvider(selected, revision.templateId));
    }
  }, { successMessage: t('providerSuccess'), errorMessage: t('providerError') });

  const { execute: preview, isLoading: previewing } = useAsyncAction(async (popup: Window) => {
    if (!selected || !draft) return;
    try {
      const rendered = await adminNotificationTemplatesApi.preview(selected, draft);
      if (popup.closed) return;
      popup.document.title = rendered.subject || t('previewTitle');
      const heading = popup.document.createElement('h1');
      heading.textContent = rendered.subject || t('previewTitle');
      const notice = popup.document.createElement('p');
      notice.textContent = t('previewNotice');
      const frame = popup.document.createElement('iframe');
      frame.title = t('previewTitle');
      frame.setAttribute('sandbox', '');
      frame.referrerPolicy = 'no-referrer';
      frame.style.width = '100%';
      frame.style.height = '85vh';
      frame.style.border = '0';
      frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; base-uri 'none'; form-action 'none'">${rendered.html}`;
      popup.document.body.replaceChildren(heading, notice, frame);
    } catch (error) {
      if (!popup.closed) popup.close();
      throw error;
    }
  }, { errorMessage: t('previewError') });

  const select = (record: NotificationTemplate | undefined) => {
    if (!record || (dirty && !window.confirm(t('discard')))) return;
    setSelected(record);
    setDraft(contentOf(record));
    setRevision(null);
  };

  const openPreview = () => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) { toast.error(t('popupBlocked')); return; }
    popup.opener = null;
    popup.document.title = t('previewTitle');
    popup.document.body.textContent = t('loading');
    void preview(popup);
  };

  if (!isAdmin) return null;
  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />
      {loading && <p role="status" className="animate-skeleton-shimmer rounded-lg p-4">{t('loading')}</p>}
      {loadFailed && <div role="alert" className="space-y-3"><p>{t('loadError')}</p><Button onClick={() => void load()}>{t('retry')}</Button></div>}
      {!loading && !loadFailed && !selected && <p>{t('empty')}</p>}
      {selected && draft && (
        <fieldset disabled={saving || previewing || providerBusy} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormSelect label={t('channel')} value={selected.channel} options={['email', 'alimtalk'].map((channel) => ({ value: channel, label: t(channel) }))} onChange={(event) => select(templates.find((record) => record.channel === event.target.value))} />
            <FormSelect label={t('template')} value={selected.key} options={[...new Set(templates.filter((record) => record.channel === selected.channel).map((record) => record.key))].map((key) => ({ value: key, label: t(`events.${key}`) }))} onChange={(event) => select(templates.find((record) => record.channel === selected.channel && record.key === event.target.value && record.locale === selected.locale))} />
            <FormSelect label={t('language')} value={selected.locale} options={templates.filter((record) => record.channel === selected.channel && record.key === selected.key).map((record) => ({ value: record.locale, label: t(record.locale) }))} onChange={(event) => select(templates.find((record) => record.channel === selected.channel && record.key === selected.key && record.locale === event.target.value))} />
          </div>
          <div className="admin-surface space-y-5 rounded-lg p-5">
            <p className="typo-body-sm text-muted-foreground">{t('variablesHelp')}</p>
            <div className="flex flex-wrap gap-2" aria-label={t('variables')}>
              {selected.variables.map((variable) => <code key={variable} className="rounded bg-muted px-2 py-1 typo-body-sm">{variable.startsWith('{') ? variable : `{{${variable}}}`}</code>)}
            </div>
            {selected.channel === 'email' ? <>
              <FormInput label={t('subject')} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
              <label className="block space-y-2"><span className="typo-body-sm font-medium">{t('html')}</span><textarea className="field-soft min-h-96 w-full rounded-lg p-3 font-mono typo-body-sm" rows={18} spellCheck={false} value={draft.html} onChange={(event) => setDraft({ ...draft, html: event.target.value })} /></label>
            </> : <>
              <p role="note" className="rounded-lg bg-muted p-4 typo-body-sm">{t('alimtalkWarning')}</p>
              <FormInput label={t('templateId')} description={t('templateIdHelp')} value={draft.templateId} onChange={(event) => setDraft({ ...draft, templateId: event.target.value })} />
              <Button variant="outline" disabled={!draft.templateId.trim()} onClick={() => { if (!dirty || window.confirm(t('discard'))) void providerAction('load'); }}>{t('loadProvider')}</Button>
            </>}
            <label className="block space-y-2"><span className="typo-body-sm font-medium">{t(selected.channel === 'email' ? 'text' : 'smsText')}</span><textarea className="field-soft w-full rounded-lg p-3 typo-body-sm" rows={6} value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} /></label>
            {selected.channel === 'alimtalk' && <div className="space-y-3 rounded-lg bg-muted p-4">
              <p className="typo-body-sm">{t('revisionHelp')}</p>
              {draft.templateId.trim() ? <Button variant="outline" onClick={() => void providerAction('create')}>{t('createRevision')}</Button> : <a className="underline" href="https://console.solapi.com" target="_blank" rel="noopener noreferrer">{t('initialTemplate')}</a>}
              {revision && <div className="space-y-3">
                <p className="typo-body-sm">{t('revisionId')}: <code>{revision.templateId}</code></p>
                <p role="status" className="typo-body-sm">{t('providerStatus')}: {t.has(`statuses.${revision.status}`) ? t(`statuses.${revision.status}`) : t('statuses.UNKNOWN')}</p>
                <pre className="whitespace-pre-wrap break-words typo-body-sm">{revision.content}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={revision.status === 'APPROVED' || revision.status === 'INSPECTING'} onClick={() => void providerAction('inspect')}>{t('requestInspection')}</Button>
                  <Button variant="outline" onClick={() => void providerAction('refresh')}>{t('refreshStatus')}</Button>
                  <Button disabled={revision.status !== 'APPROVED'} onClick={() => setDraft({ ...draft, templateId: revision.templateId })}>{t('useApproved')}</Button>
                </div>
              </div>}
            </div>}
            <p className="typo-body-sm text-muted-foreground">{t('saveNotice')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!dirty} onClick={() => void save()}>{t(saving ? 'saving' : 'save')}</Button>
              {selected.channel === 'email' && <Button variant="outline" onClick={openPreview}>{t('preview')}</Button>}
              {dirty && <span role="status" className="typo-body-sm text-muted-foreground">{t('unsaved')}</span>}
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
