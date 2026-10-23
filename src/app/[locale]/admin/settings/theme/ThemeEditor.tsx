'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { settingsApi, adminSettingsApi, type SiteSetting } from '@/lib/api';
import { isValidThemeCssValue } from '@/lib/theme-style';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { cn } from '@/components/ui/utils';
import { toastMessage } from '@/utils/toastMessages';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState } from '@/components/shared/admin/AdminStates';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { revalidateTheme } from './actions';

const TABS = ['color', 'color_dark', 'typography', 'spacing', 'radius'] as const;
type TabId = (typeof TABS)[number];

interface Props {
  initialSettings: SiteSetting[];
}

function normalizeSettings(settings: SiteSetting[]): SiteSetting[] {
  return settings.map((setting) => ({
    ...setting,
    value: String(setting.value),
    valueEn: setting.valueEn == null ? null : String(setting.valueEn),
    defaultValue: String(setting.defaultValue),
  }));
}

function colorPickerValue(value: string): string {
  const trimmed = value.trim();
  if (!isValidThemeCssValue('color_primary', trimmed)) return '#000000';
  if (trimmed.startsWith('#')) {
    return trimmed.length <= 5
      ? `#${trimmed.slice(1, 4).split('').map((channel) => channel.repeat(2)).join('')}`
      : trimmed.slice(0, 7);
  }
  return `#${trimmed.match(/\d+/g)!.map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
}

function ThemePreviewPanel({ settings, isDark, english }: { settings: SiteSetting[]; isDark: boolean; english: boolean }) {
  const t = useTranslations('admin.settings');
  const values = Object.fromEntries(settings.map((setting) => {
    const value = english && setting.valueEn?.trim() ? setting.valueEn : setting.value;
    return [setting.key, isValidThemeCssValue(setting.key, value) ? value : setting.defaultValue];
  }));
  const color = (name: string) => values[`color_${isDark ? 'dark_' : ''}${name}`];
  return (
    <section
      aria-label={t('preview')}
      className="surface-card min-w-0 space-y-4 overflow-auto p-4"
      style={{
        background: color('background'), color: color('foreground'),
        fontFamily: `'Roboto Condensed', ${values.font_family_base}`, fontSize: values.font_size_base,
        fontWeight: values.font_weight_normal, lineHeight: values.line_height_base,
        padding: values.spacing_md, borderRadius: values.radius_lg,
      }}
    >
      <h3 className="typo-body-sm font-semibold">{t('preview')} ({t(isDark ? 'color_dark' : 'color')})</h3>
      <div className="flex flex-wrap gap-2" style={{ gap: values.spacing_sm }}>
        {(['primary', 'secondary', 'destructive'] as const).map((variant) => (
          <Button key={variant} type="button" variant={variant} style={{
            background: color(variant), color: color(`${variant}_foreground`), borderColor: color('border'),
            borderRadius: values.radius_md,
          }}>{t(variant)}</Button>
        ))}
      </div>
      <div className="surface-card p-4" style={{
        background: color('card'), color: color('card_foreground'), borderColor: color('border'),
        padding: values.spacing_lg, borderRadius: values.radius_lg,
      }}>
        <h4 style={{ fontWeight: values.font_weight_bold }}>{t('cardTitle')}</h4>
        <p>{t('bodySample')}</p>
        <p style={{ color: color('muted_foreground') }}>{t('mutedSample')}</p>
      </div>
      <FormInput readOnly value={t('inputSample')} aria-label={t('inputSample')} style={{
        background: color('background'), color: color('foreground'), borderColor: color('input'),
        borderRadius: values.radius_sm,
      }} />
      <div className="flex flex-wrap gap-2">
        {settings.filter((setting) => setting.group === (isDark ? 'color_dark' : 'color')).map((setting) => (
          <span key={setting.key} className="inline-flex items-center gap-1 typo-label">
            <span className="inline-block h-4 w-4 border" style={{ background: values[setting.key] }} />
            {setting.label}
          </span>
        ))}
      </div>
      {settings.filter((setting) => setting.group === 'spacing' || setting.group === 'radius').map((setting) => (
        <div key={setting.key} className="flex items-center gap-2 typo-label">
          <span>{setting.label}</span>
          <span className="inline-block h-6 w-16" style={{
            background: color('primary'),
            ...(setting.group === 'spacing' ? { width: values[setting.key] } : { borderRadius: values[setting.key] }),
          }} />
          <span>{values[setting.key]}</span>
        </div>
      ))}
    </section>
  );
}

export default function ThemeEditor({ initialSettings }: Props) {
  const t = useTranslations('admin.settings');
  const router = useRouter();
  const [settings, setSettings] = useState(() => normalizeSettings(initialSettings));
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingEnChanges, setPendingEnChanges] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('color');
  const [previewLocale, setPreviewLocale] = useState('ko');
  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingEnChanges).length > 0;
  useUnsavedChanges(hasChanges);

  const currentSettings = settings.map((setting) => ({
    ...setting,
    value: pendingChanges[setting.key] ?? setting.value,
    valueEn: pendingEnChanges[setting.key] ?? setting.valueEn,
  }));
  const invalidChanges = Object.entries(pendingChanges).some(([key, value]) => !isValidThemeCssValue(key, value))
    || Object.entries(pendingEnChanges).some(([key, value]) => value.trim() !== '' && !isValidThemeCssValue(key, value));

  const { execute: save, isLoading: saving } = useAsyncAction(async () => {
    const keys = new Set([...Object.keys(pendingChanges), ...Object.keys(pendingEnChanges)]);
    await adminSettingsApi.bulkUpdate(Array.from(keys, (key) => ({
      key,
      ...(pendingChanges[key] !== undefined ? { value: pendingChanges[key].trim() } : {}),
      ...(pendingEnChanges[key] !== undefined ? { valueEn: pendingEnChanges[key].trim() } : {}),
    })));
    await revalidateTheme();
    setSettings(currentSettings);
    setPendingChanges({});
    setPendingEnChanges({});
    toast.success(toastMessage('themeSaved'));
    router.refresh();
  }, { errorMessage: toastMessage('saveError') });

  const { execute: reset, isLoading: resetting } = useAsyncAction(async () => {
    await adminSettingsApi.reset();
    await revalidateTheme();
    const fresh = await settingsApi.getAll();
    setSettings(normalizeSettings(fresh));
    setPendingChanges({});
    setPendingEnChanges({});
    toast.success(toastMessage('themeReset'));
    router.refresh();
  }, { errorMessage: toastMessage('resetError') });

  const change = (setting: SiteSetting, value: string, english = false) => {
    const setter = english ? setPendingEnChanges : setPendingChanges;
    const original = english ? setting.valueEn ?? '' : setting.value;
    setter((previous) => {
      const next = { ...previous };
      if (value === original) delete next[setting.key];
      else next[setting.key] = value;
      return next;
    });
  };

  const filteredSettings = currentSettings.filter((setting) => setting.group === activeTab);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} actions={
        <div className="flex gap-2">
          <Button variant="outline" type="button" disabled={saving || resetting} onClick={() => {
            if (!saving && !resetting && window.confirm(t('themeResetConfirm'))) void reset();
          }}>{t(resetting ? 'resetting' : 'reset')}</Button>
          <Button type="button" disabled={!hasChanges || invalidChanges || saving || resetting} onClick={() => {
            if (hasChanges && !invalidChanges && !saving && !resetting) void save();
          }}>{t(saving ? 'saving' : 'save')}</Button>
        </div>
      } />
      <div className="flex flex-wrap border-b" role="tablist" aria-label={t('title')}>
        {TABS.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={cn(
            '-mb-px min-h-11 border-b-2 px-4 py-2 typo-body-sm font-medium transition-colors',
            activeTab === tab ? 'border-primary text-foreground hover:bg-muted' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}>{t(tab)}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <fieldset disabled={saving || resetting} className="surface-card min-w-0 p-4">
          {filteredSettings.length === 0 ? <AdminEmptyState title={t('empty')} /> :
            filteredSettings.map((setting) => {
              const original = settings.find((item) => item.key === setting.key)!;
              return (
                <div key={setting.key} className="flex flex-wrap items-center justify-between gap-4 border-soft border-b py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="typo-body-sm font-medium">{setting.label}</p>
                    <p className="typo-label text-muted-foreground">{setting.key}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {setting.inputType === 'color' && <input type="color" value={colorPickerValue(setting.value)}
                        onChange={(event) => change(original, event.target.value)} aria-label={setting.label}
                        className="field-soft h-11 w-11 cursor-pointer rounded p-0.5" />}
                      <FormInput type={setting.inputType === 'number' ? 'number' : 'text'} step="any" value={setting.value}
                        onChange={(event) => change(original, event.target.value)}
                        aria-label={setting.inputType === 'color' ? t('valueLabel', { label: setting.label }) : setting.label}
                        error={isValidThemeCssValue(setting.key, setting.value) ? undefined : t('invalidValue')}
                        className="w-40" placeholder={setting.inputType === 'color' ? '#000000' : undefined} />
                    </div>
                    <FormInput value={setting.valueEn ?? ''} onChange={(event) => change(original, event.target.value, true)}
                      aria-label={`${setting.label} (EN)`} className="w-40" placeholder={t('englishFallback')}
                      error={!setting.valueEn?.trim() || isValidThemeCssValue(setting.key, setting.valueEn) ? undefined : t('invalidValue')} />
                  </div>
                </div>
              );
            })}
        </fieldset>
        <div className="min-w-0 space-y-3">
          <FormSelect label={t('previewLocale')} value={previewLocale} onChange={(event) => setPreviewLocale(event.target.value)}
            options={[{ value: 'ko', label: t('korean') }, { value: 'en', label: t('english') }]} />
          <ThemePreviewPanel settings={currentSettings} isDark={activeTab === 'color_dark'} english={previewLocale === 'en'} />
        </div>
      </div>
    </div>
  );
}
