'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { attributesApi } from '@/lib/api';
import type { AttributeType } from '@/lib/api';
import { handleApiError } from '@/utils/error';

type InputType = AttributeType['inputType'];

interface AttributeFormState {
  id: number | null;
  code: string;
  name: string;
  nameEn: string;
  inputType: InputType;
  parentId: string;
  relatedTypeIds: string;
  validValues: string;
  sortOrder: string;
  isFilterable: boolean;
  isSearchable: boolean;
}

const emptyForm: AttributeFormState = {
  id: null,
  code: '',
  name: '',
  nameEn: '',
  inputType: 'text',
  parentId: '',
  relatedTypeIds: '',
  validValues: '',
  sortOrder: '0',
  isFilterable: false,
  isSearchable: false,
};

function toForm(attribute: AttributeType): AttributeFormState {
  return {
    id: attribute.id,
    code: attribute.code,
    name: attribute.name,
    nameEn: attribute.nameEn ?? '',
    inputType: attribute.inputType,
    parentId: attribute.parentId == null ? '' : String(attribute.parentId),
    relatedTypeIds: attribute.relatedTypeIds?.join(', ') ?? '',
    validValues: attribute.validValues?.join('\n') ?? '',
    sortOrder: String(attribute.sortOrder ?? 0),
    isFilterable: attribute.isFilterable,
    isSearchable: attribute.isSearchable,
  };
}

function parseNumberList(value: string): number[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((item) => Number.isFinite(item));
}

function parseStringList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminAttributesPage() {
  const t = useTranslations('admin.attributes');
  const { isAdmin } = useAdminGuard();
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [form, setForm] = useState<AttributeFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(
    () => attributes.filter((attribute) => attribute.id !== form.id),
    [attributes, form.id],
  );

  const loadAttributes = async () => {
    setLoading(true);
    try {
      setAttributes(await attributesApi.getTypes());
    } catch (err) {
      toast.error(handleApiError(err, t('loadError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void loadAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const updateForm = <K extends keyof AttributeFormState>(key: K, value: AttributeFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        inputType: form.inputType,
        parentId: form.parentId ? Number(form.parentId) : null,
        relatedTypeIds: parseNumberList(form.relatedTypeIds),
        validValues: parseStringList(form.validValues),
        sortOrder: Number(form.sortOrder) || 0,
        isFilterable: form.isFilterable,
        isSearchable: form.isSearchable,
      };
      if (form.id == null) await attributesApi.createType(payload);
      else await attributesApi.updateType(form.id, payload);
      toast.success(t('saveSuccess'));
      setForm(emptyForm);
      await loadAttributes();
    } catch (err) {
      toast.error(handleApiError(err, t('saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (attribute: AttributeType) => {
    try {
      await attributesApi.deleteType(attribute.id);
      toast.success(t('deleteSuccess'));
      if (form.id === attribute.id) setForm(emptyForm);
      await loadAttributes();
    } catch (err) {
      toast.error(handleApiError(err, t('deleteError')));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <AdminPageHeader title={t('title')} />
      <p className="typo-body-sm text-muted-foreground">{t('description')}</p>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('code')}</span>
          <input
            value={form.code}
            onChange={(event) => updateForm('code', event.target.value)}
            required
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('name')}</span>
          <input
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
            required
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('nameEn')}</span>
          <input
            value={form.nameEn}
            onChange={(event) => updateForm('nameEn', event.target.value)}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('inputType')}</span>
          <select
            value={form.inputType}
            onChange={(event) => updateForm('inputType', event.target.value as InputType)}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          >
            <option value="text">text</option>
            <option value="select">select</option>
            <option value="range">range</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('parent')}</span>
          <select
            value={form.parentId}
            onChange={(event) => updateForm('parentId', event.target.value)}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          >
            <option value="">{t('none')}</option>
            {parentOptions.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('related')}</span>
          <input
            value={form.relatedTypeIds}
            onChange={(event) => updateForm('relatedTypeIds', event.target.value)}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="typo-label text-muted-foreground">{t('validValues')}</span>
          <textarea
            value={form.validValues}
            onChange={(event) => updateForm('validValues', event.target.value)}
            rows={3}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('sortOrder')}</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) => updateForm('sortOrder', event.target.value)}
            className="w-full rounded border bg-background px-3 py-2 typo-body-sm"
          />
        </label>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 typo-body-sm">
            <input
              type="checkbox"
              checked={form.isFilterable}
              onChange={(event) => updateForm('isFilterable', event.target.checked)}
            />
            {t('filterable')}
          </label>
          <label className="flex items-center gap-2 typo-body-sm">
            <input
              type="checkbox"
              checked={form.isSearchable}
              onChange={(event) => updateForm('isSearchable', event.target.checked)}
            />
            {t('searchable')}
          </label>
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="rounded border px-4 py-2 typo-body-sm hover:bg-secondary"
          >
            {t('create')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full typo-body-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left">{t('code')}</th>
              <th className="px-4 py-3 text-left">{t('name')}</th>
              <th className="px-4 py-3 text-left">{t('parent')}</th>
              <th className="px-4 py-3 text-left">{t('related')}</th>
              <th className="px-4 py-3 text-right">{t('delete')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {attributes.map((attribute) => (
              <tr
                key={attribute.id}
                className="cursor-pointer hover:bg-secondary/30"
                onClick={() => setForm(toForm(attribute))}
              >
                <td className="px-4 py-3 font-medium">{attribute.code}</td>
                <td className="px-4 py-3">{attribute.name}</td>
                <td className="px-4 py-3">
                  {attributes.find((item) => item.id === attribute.parentId)?.name ?? t('none')}
                </td>
                <td className="px-4 py-3">{attribute.relatedTypeIds?.join(', ') || t('none')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(attribute);
                    }}
                    className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    {t('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && attributes.length === 0 && (
          <p className="p-6 text-center typo-body-sm text-muted-foreground">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
