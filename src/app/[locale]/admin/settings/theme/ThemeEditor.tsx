'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { settingsApi, adminSettingsApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import type { SiteSetting } from '@/lib/api';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { cn } from '@/components/ui/utils';

const TABS = [
  { id: 'color', label: '색상' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'spacing', label: '간격' },
  { id: 'radius', label: '모서리' },
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
  const handleChange = (value: string) => {
    onChange(setting.key, value);
    document.documentElement.style.setProperty(
      `--db-${setting.key.replace(/_/g, '-')}`,
      value,
    );
  };

  return (
    <div className="flex items-center gap-4 border-b py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{setting.label}</p>
        <p className="text-xs text-muted-foreground">{setting.key}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border p-0.5"
        />
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-24 rounded border px-2 py-1 font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function GenericTokenRow({
  setting,
  currentValue,
  onChange,
}: {
  setting: SiteSetting;
  currentValue: string;
  onChange: (key: string, value: string) => void;
}) {
  const handleChange = (value: string) => {
    onChange(setting.key, value);
    document.documentElement.style.setProperty(
      `--db-${setting.key.replace(/_/g, '-')}`,
      value,
    );
  };

  return (
    <div className="flex items-center gap-4 border-b py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{setting.label}</p>
        <p className="text-xs text-muted-foreground">{setting.key}</p>
      </div>
      <input
        type={setting.inputType === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-40 rounded border px-2 py-1 text-sm"
      />
    </div>
  );
}

function ThemePreviewPanel() {
  return (
    <div className="space-y-4 rounded-lg border bg-background p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        라이브 프리뷰
      </h3>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          Primary 버튼
        </button>
        <button className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:opacity-90">
          Secondary 버튼
        </button>
        <button className="rounded-md bg-destructive px-4 py-2 text-sm text-white hover:opacity-90">
          Destructive 버튼
        </button>
      </div>
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <h4 className="font-semibold text-foreground">카드 제목</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          카드 본문 텍스트 예시입니다.
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold text-foreground">Heading 텍스트</p>
        <p className="text-sm text-foreground">Body 텍스트 예시입니다.</p>
        <p className="text-sm text-muted-foreground">
          Muted 텍스트 예시입니다.
        </p>
      </div>
      <input
        readOnly
        value="Input 필드 예시"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export default function ThemeEditor({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSetting[]>(initialSettings);
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, string>
  >({});
  const [activeTab, setActiveTab] = useState<TabId>('color');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const hasChanges = Object.keys(pendingChanges).length > 0;
  useUnsavedChanges(hasChanges);

  const getCurrentValue = useCallback(
    (setting: SiteSetting) => pendingChanges[setting.key] ?? setting.value,
    [pendingChanges],
  );

  const handleChange = useCallback((key: string, value: string) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const items = Object.entries(pendingChanges).map(([key, value]) => ({
        key,
        value,
      }));
      await adminSettingsApi.bulkUpdate(items);
      setSettings((prev) =>
        prev.map((s) =>
          pendingChanges[s.key] !== undefined
            ? { ...s, value: pendingChanges[s.key] }
            : s,
        ),
      );
      setPendingChanges({});
      toast.success('테마 설정이 저장되었습니다.');
      router.refresh();
    } catch (err) {
      toast.error(handleApiError(err, '저장에 실패했습니다.'));
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
      fresh.forEach((s) => {
        document.documentElement.style.setProperty(
          `--db-${s.key.replace(/_/g, '-')}`,
          s.defaultValue,
        );
      });
      toast.success('기본값으로 초기화되었습니다.');
      router.refresh();
    } catch (err) {
      toast.error(handleApiError(err, '초기화에 실패했습니다.'));
    } finally {
      setResetting(false);
    }
  };

  const filteredSettings = settings.filter((s) => s.group === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">테마 편집</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            색상·폰트·간격·모서리를 편집하고 저장하면 사이트에 즉시
            반영됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className={cn(
              'rounded-md border px-4 py-2 text-sm transition-colors',
              resetting ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted',
            )}
          >
            {resetting ? '초기화 중...' : '기본값으로 초기화'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              'rounded-md px-4 py-2 text-sm transition-colors',
              hasChanges && !saving
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

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
        <div className="rounded-lg border bg-background p-4">
          {filteredSettings.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              설정 항목이 없습니다.
            </p>
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
                  onChange={handleChange}
                />
              ),
            )
          )}
        </div>

        <ThemePreviewPanel />
      </div>
    </div>
  );
}
