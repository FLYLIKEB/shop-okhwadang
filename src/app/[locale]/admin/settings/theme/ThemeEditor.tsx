'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { settingsApi, adminSettingsApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import type { SiteSetting } from '@/lib/api';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { cn } from '@/components/ui/utils';
import { toastMessage } from '@/utils/toastMessages';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState } from '@/components/shared/admin/AdminStates';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';

const TABS = [
  { id: 'color',       label: '라이트 색상' },
  { id: 'color_dark',  label: '다크 색상' },
  { id: 'typography',  label: '타이포그래피' },
  { id: 'spacing',     label: '간격' },
  { id: 'radius',      label: '모서리' },
] as const;
type TabId = (typeof TABS)[number]['id'];

interface Props {
  initialSettings: SiteSetting[];
}

function ColorTokenRow({
  setting,
  currentValue,
  onChange,
}: {
  setting: SiteSetting;
  currentValue: string;
  onChange: (key: string, value: string) => void;
}) {
  const isDark = setting.group === 'color_dark';

  const handleChange = (value: string) => {
    onChange(setting.key, value);
    const cssVarName = isDark
      ? `--db-${setting.key.replace(/_/g, '-')}`
      : `--db-${setting.key.replace(/_/g, '-')}`;
    if (isDark) {
      // 다크 변수는 html[data-theme="dark"] 스코프에 적용
      document.documentElement.style.setProperty(cssVarName, value);
    } else {
      document.documentElement.style.setProperty(cssVarName, value);
    }
  };

  return (
    <div className="flex items-center gap-4 border-soft border-b py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="typo-body-sm font-medium">{setting.label}</p>
        <p className="typo-label text-muted-foreground">{setting.key}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={setting.label}
          className="field-soft h-8 w-10 cursor-pointer rounded p-0.5"
        />
        <FormInput
          type="text"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={`${setting.label} 값`}
          className="w-24 font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function GenericTokenRow({
  setting,
  currentValue,
  currentValueEn,
  onChange,
  onChangeEn,
}: {
  setting: SiteSetting;
  currentValue: string;
  currentValueEn: string;
  onChange: (key: string, value: string) => void;
  onChangeEn: (key: string, value: string) => void;
}) {
  const handleChange = (value: string) => {
    onChange(setting.key, value);
    document.documentElement.style.setProperty(
      `--db-${setting.key.replace(/_/g, '-')}`,
      value,
    );
  };

  return (
    <div className="flex items-center gap-4 border-soft border-b py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="typo-body-sm font-medium">{setting.label}</p>
        <p className="typo-label text-muted-foreground">{setting.key}</p>
      </div>
      <div className="flex flex-col gap-1">
        <FormInput
          type={setting.inputType === 'number' ? 'number' : 'text'}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={setting.label}
          className="w-40"
        />
        <FormInput
          value={currentValueEn}
          onChange={(e) => onChangeEn(setting.key, e.target.value)}
          aria-label={`${setting.label} (EN)`}
          className="w-40 text-xs text-muted-foreground placeholder:text-muted-foreground/50"
          placeholder="EN"
        />
      </div>
    </div>
  );
}

function ThemePreviewPanel({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="surface-card space-y-4 p-4"
      style={{ background: isDark ? 'var(--db-color-dark-background, #121212)' : 'var(--color-background)' }}
    >
      <h3
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: isDark ? 'var(--db-color-dark-muted-foreground, #909090)' : 'var(--color-muted-foreground)' }}
      >
        라이브 프리뷰 {isDark ? '(다크)' : '(라이트)'}
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary"
          className="rounded-md px-4 py-2 text-sm hover:opacity-90"
          style={{
            background: isDark ? 'var(--db-color-dark-primary, #9C9C9C)' : 'var(--color-primary)',
            color: isDark ? 'var(--db-color-dark-primary-foreground, #121212)' : 'var(--color-primary-foreground)',
          }}
        >
          Primary 버튼
        </Button>
        <Button type="button" variant="secondary"
          className="rounded-md px-4 py-2 text-sm hover:opacity-90"
          style={{
            background: isDark ? 'var(--db-color-dark-secondary, #1C1C1C)' : 'var(--color-secondary)',
            color: isDark ? 'var(--db-color-dark-secondary-foreground, #E1E1E1)' : 'var(--color-secondary-foreground)',
          }}
        >
          Secondary 버튼
        </Button>
        <Button type="button" variant="destructive"
          className="rounded-md px-4 py-2 text-sm text-white hover:opacity-90"
          style={{ background: isDark ? 'var(--db-color-dark-destructive, #ef4444)' : 'var(--color-destructive)' }}
        >
          Destructive 버튼
        </Button>
      </div>
      <div
        className="surface-card p-4"
        style={{
          background: isDark ? 'var(--db-color-dark-card, #171717)' : 'var(--color-card)',
          borderColor: isDark ? 'var(--db-color-dark-border, #292929)' : 'var(--color-border)',
        }}
      >
        <h4
          className="font-semibold"
          style={{ color: isDark ? 'var(--db-color-dark-card-foreground, #EDEDED)' : 'var(--color-card-foreground)' }}
        >
          카드 제목
        </h4>
        <p
          className="mt-1 text-sm"
          style={{ color: isDark ? 'var(--db-color-dark-muted-foreground, #909090)' : 'var(--color-muted-foreground)' }}
        >
          카드 본문 텍스트 예시입니다.
        </p>
      </div>
      <div className="space-y-1">
        <p
          className="text-lg font-bold"
          style={{ color: isDark ? 'var(--db-color-dark-foreground, #EDEDED)' : 'var(--color-foreground)' }}
        >
          Heading 텍스트
        </p>
        <p
          className="text-sm"
          style={{ color: isDark ? 'var(--db-color-dark-foreground, #EDEDED)' : 'var(--color-foreground)' }}
        >
          Body 텍스트 예시입니다.
        </p>
        <p
          className="text-sm"
          style={{ color: isDark ? 'var(--db-color-dark-muted-foreground, #909090)' : 'var(--color-muted-foreground)' }}
        >
          Muted 텍스트 예시입니다.
        </p>
      </div>
      <FormInput
        readOnly
        value="Input 필드 예시"
        aria-label="Input 필드 예시"
        className="w-full"
        style={{
          background: isDark ? 'var(--db-color-dark-background, #121212)' : 'var(--color-background)',
          borderColor: isDark ? 'var(--db-color-dark-input, #292929)' : 'var(--color-input)',
          color: isDark ? 'var(--db-color-dark-foreground, #EDEDED)' : 'var(--color-foreground)',
        }}
      />
    </div>
  );
}

export default function ThemeEditor({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSetting[]>(initialSettings);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingEnChanges, setPendingEnChanges] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('color');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingEnChanges).length > 0;
  useUnsavedChanges(hasChanges);

  const getCurrentValue = useCallback(
    (setting: SiteSetting) => pendingChanges[setting.key] ?? setting.value,
    [pendingChanges],
  );

  const getCurrentValueEn = useCallback(
    (setting: SiteSetting) => pendingEnChanges[setting.key] ?? (setting.valueEn ?? ''),
    [pendingEnChanges],
  );

  const handleChange = useCallback((key: string, value: string) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleChangeEn = useCallback((key: string, value: string) => {
    setPendingEnChanges((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const allKeys = new Set([...Object.keys(pendingChanges), ...Object.keys(pendingEnChanges)]);
      const items = Array.from(allKeys).map((key) => {
        const payload: { key: string; value?: string; valueEn?: string } = { key };
        if (pendingChanges[key] !== undefined) payload.value = pendingChanges[key];
        if (pendingEnChanges[key] !== undefined) payload.valueEn = pendingEnChanges[key];
        return payload;
      });
      await adminSettingsApi.bulkUpdate(items);
      setSettings((prev) =>
        prev.map((s) => ({
          ...s,
          ...(pendingChanges[s.key] !== undefined ? { value: pendingChanges[s.key] } : {}),
          ...(pendingEnChanges[s.key] !== undefined ? { valueEn: pendingEnChanges[s.key] } : {}),
        })),
      );
      setPendingChanges({});
      setPendingEnChanges({});
      toast.success(toastMessage('themeSaved'));
      router.refresh();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      '모든 설정을 기본값으로 초기화하시겠습니까?',
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await adminSettingsApi.reset();
      const fresh = await settingsApi.getAll();
      setSettings(fresh);
      setPendingChanges({});
      setPendingEnChanges({});
      fresh.forEach((s) => {
        document.documentElement.style.setProperty(
          `--db-${s.key.replace(/_/g, '-')}`,
          s.defaultValue,
        );
      });
      toast.success(toastMessage('themeReset'));
      router.refresh();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('resetError')));
    } finally {
      setResetting(false);
    }
  };

  const filteredSettings = settings.filter((s) => s.group === activeTab);
  const isDarkTab = activeTab === 'color_dark';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="테마 편집"
        description="색상·폰트·간격·모서리를 편집하고 저장하면 사이트에 즉시 반영됩니다."
        actions={
          <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? '초기화 중...' : '기본값으로 초기화'}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
          </div>
        }
      />

      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-4">
          {filteredSettings.length === 0 ? (
            <AdminEmptyState title="설정 항목이 없습니다." />
          ) : (
            filteredSettings.map((setting) =>
              setting.inputType === 'color' ? (
                <ColorTokenRow
                  key={setting.key}
                  setting={setting}
                  currentValue={getCurrentValue(setting)}
                  onChange={handleChange}
                />
              ) : (
                <GenericTokenRow
                  key={setting.key}
                  setting={setting}
                  currentValue={getCurrentValue(setting)}
                  currentValueEn={getCurrentValueEn(setting)}
                  onChange={handleChange}
                  onChangeEn={handleChangeEn}
                />
              ),
            )
          )}
        </div>

        <ThemePreviewPanel isDark={isDarkTab} />
      </div>
    </div>
  );
}
