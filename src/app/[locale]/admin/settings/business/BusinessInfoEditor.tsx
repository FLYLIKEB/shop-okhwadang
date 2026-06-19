'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminSettingsApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import type { SiteSetting } from '@/lib/api';
import { useUnsavedChanges } from '@/components/shared/hooks/useUnsavedChanges';
import { cn } from '@/components/ui/utils';
import { toastMessage } from '@/utils/toastMessages';

const FIELD_ORDER = [
  'business_company_name',
  'business_ceo',
  'business_registration_number',
  'business_mail_order_number',
  'business_address',
  'business_phone',
  'business_email',
  'business_hours',
  'business_privacy_officer',
  'business_info_url',
] as const;

interface Props {
  initialSettings: SiteSetting[];
}

function FieldRow({
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
  return (
    <div className="grid grid-cols-1 gap-2 border-b py-4 last:border-0 sm:grid-cols-[1fr_2fr]">
      <div>
        <p className="text-sm font-medium">{setting.label}</p>
        <p className="text-xs text-muted-foreground">{setting.key}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(setting.key, e.target.value)}
          className="w-full rounded border px-3 py-1.5 text-sm"
          placeholder="한국어"
        />
        <input
          type="text"
          value={currentValueEn}
          onChange={(e) => onChangeEn(setting.key, e.target.value)}
          className="w-full rounded border px-3 py-1.5 text-xs text-muted-foreground placeholder:text-muted-foreground/50"
          placeholder="English"
        />
      </div>
    </div>
  );
}

export default function BusinessInfoEditor({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSetting[]>(initialSettings);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingEnChanges, setPendingEnChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
      toast.success(toastMessage('saved'));
      router.refresh();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('saveError')));
    } finally {
      setSaving(false);
    }
  };

  const orderedSettings = FIELD_ORDER
    .map((key) => settings.find((s) => s.key === key))
    .filter((s): s is SiteSetting => s !== undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">사업자 정보 설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Footer에 표시되는 사업자 정보를 관리합니다. (전자상거래법 제10조)
          </p>
        </div>
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

      <div className="rounded-lg border bg-background p-4">
        {orderedSettings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            사업자 정보 설정이 없습니다. DB 마이그레이션을 실행해 주세요.
          </p>
        ) : (
          orderedSettings.map((setting) => (
            <FieldRow
              key={setting.key}
              setting={setting}
              currentValue={getCurrentValue(setting)}
              currentValueEn={getCurrentValueEn(setting)}
              onChange={handleChange}
              onChangeEn={handleChangeEn}
            />
          ))
        )}
      </div>
    </div>
  );
}
