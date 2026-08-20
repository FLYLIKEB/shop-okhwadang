'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminEmptyState } from '@/components/shared/admin/AdminStates';
import EntitySelector from '@/components/shared/admin/page-editor/EntitySelector';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { attributesApi } from '@/lib/api';
import type { AttributeType, ManagedAttributeValueOption } from '@/lib/api';
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
  const [validValueDraft, setValidValueDraft] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeType | null>(null);
  const [valueOptions, setValueOptions] = useState<ManagedAttributeValueOption[]>([]);
  const [valueOptionDrafts, setValueOptionDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(
    () => attributes.filter((attribute) => attribute.id !== form.id),
    [attributes, form.id],
  );

  const loadValueOptions = async (attribute: AttributeType) => {
    setLoadingValues(true);
    try {
      const options = await attributesApi.getTypeValueOptions(attribute.code);
      setSelectedAttribute(attribute);
      setValueOptions(options);
      setValueOptionDrafts(Object.fromEntries(options.map((option) => [option.value, option.displayValue ?? ''])));
    } catch (err) {
      toast.error(handleApiError(err, t('valueOptionsLoadError')));
    } finally {
      setLoadingValues(false);
    }
  };

  const loadAttributes = async () => {
    setLoading(true);
    try {
      const loadedAttributes = await attributesApi.getTypes();
      setAttributes(loadedAttributes);
      if (selectedAttribute) {
        const refreshed = loadedAttributes.find((attribute) => attribute.id === selectedAttribute.id);
        if (refreshed) await loadValueOptions(refreshed);
      }
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

  const validValueTags = useMemo(() => parseStringList(form.validValues), [form.validValues]);

  const setValidValueTags = (values: string[]) => {
    updateForm('validValues', Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join('\n'));
  };

  const addValidValueDraft = () => {
    const values = parseStringList(validValueDraft);
    if (values.length === 0) return;
    setValidValueTags([...validValueTags, ...values]);
    setValidValueDraft('');
  };

  const removeValidValue = (value: string) => {
    setValidValueTags(validValueTags.filter((item) => item !== value));
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

  const handleValueOptionDraftChange = (value: string, displayValue: string) => {
    setValueOptionDrafts((prev) => ({ ...prev, [value]: displayValue }));
  };

  const saveValueOption = async (option: ManagedAttributeValueOption) => {
    if (!selectedAttribute) return;
    try {
      const updated = await attributesApi.updateTypeValueOption(selectedAttribute.code, option.value, {
        displayValue: (valueOptionDrafts[option.value] ?? '').trim(),
        sortOrder: option.sortOrder,
        isActive: option.isActive,
      });
      setValueOptions((prev) => prev.map((item) => (item.value === option.value ? updated : item)));
      setValueOptionDrafts((prev) => ({ ...prev, [option.value]: updated.displayValue ?? '' }));
      toast.success(t('valueOptionSaveSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('valueOptionSaveError')));
    }
  };

  const linkProduct = async (option: ManagedAttributeValueOption, productId: number) => {
    if (!selectedAttribute) return;
    try {
      const updated = await attributesApi.linkProductToTypeValue(selectedAttribute.code, option.value, productId);
      setValueOptions((prev) => prev.map((item) => (item.value === option.value ? updated : item)));
      toast.success(t('productLinkSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('productLinkError')));
    }
  };

  const handleLinkedProductsChange = (option: ManagedAttributeValueOption, nextProductIds: number[]) => {
    const currentProductIds = option.products.map((product) => product.id);
    const addedProductId = nextProductIds.find((id) => !currentProductIds.includes(id));
    if (addedProductId !== undefined) {
      void linkProduct(option, addedProductId);
      return;
    }
    const removedProductId = currentProductIds.find((id) => !nextProductIds.includes(id));
    if (removedProductId !== undefined) {
      void unlinkProduct(option, removedProductId);
    }
  };

  const unlinkProduct = async (option: ManagedAttributeValueOption, productId: number) => {
    if (!selectedAttribute) return;
    try {
      const updated = await attributesApi.unlinkProductFromTypeValue(selectedAttribute.code, option.value, productId);
      setValueOptions((prev) => prev.map((item) => (item.value === option.value ? updated : item)));
      toast.success(t('productUnlinkSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, t('productUnlinkError')));
    }
  };

  const handleDelete = async (attribute: AttributeType) => {
    try {
      await attributesApi.deleteType(attribute.id);
      toast.success(t('deleteSuccess'));
      if (form.id === attribute.id) setForm(emptyForm);
      if (selectedAttribute?.id === attribute.id) {
        setSelectedAttribute(null);
        setValueOptions([]);
      }
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
        className="surface-card grid gap-3 p-4 md:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('code')}</span>
          <input
            value={form.code}
            onChange={(event) => updateForm('code', event.target.value)}
            required
            className="w-full field-soft px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('name')}</span>
          <input
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
            required
            className="w-full field-soft px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('nameEn')}</span>
          <input
            value={form.nameEn}
            onChange={(event) => updateForm('nameEn', event.target.value)}
            className="w-full field-soft px-3 py-2 typo-body-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('inputType')}</span>
          <select
            value={form.inputType}
            onChange={(event) => updateForm('inputType', event.target.value as InputType)}
            className="w-full field-soft px-3 py-2 typo-body-sm"
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
            className="w-full field-soft px-3 py-2 typo-body-sm"
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
            className="w-full field-soft px-3 py-2 typo-body-sm"
          />
        </label>
        <div className="space-y-2 md:col-span-2">
          <span className="typo-label text-muted-foreground">{t('validValues')}</span>
          <div className="flex flex-wrap gap-2 field-soft p-2">
            {validValueTags.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 typo-label text-secondary-foreground"
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeValidValue(value)}
                  aria-label={t('removeValidValue', { value })}
                  className="rounded-full px-1 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
            {validValueTags.length === 0 && (
              <span className="px-1 py-1 typo-body-sm text-muted-foreground">
                {t('noValidValues')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              aria-label={t('validValues')}
              value={validValueDraft}
              onChange={(event) => setValidValueDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addValidValueDraft();
                }
              }}
              placeholder={t('validValuePlaceholder')}
              className="min-w-0 flex-1 field-soft px-3 py-2 typo-body-sm"
            />
            <button
              type="button"
              onClick={addValidValueDraft}
              className="border-soft rounded-md px-3 py-2 typo-body-sm hover:bg-secondary"
            >
              {t('addValidValue')}
            </button>
          </div>
        </div>
        <label className="space-y-1">
          <span className="typo-label text-muted-foreground">{t('sortOrder')}</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) => updateForm('sortOrder', event.target.value)}
            className="w-full field-soft px-3 py-2 typo-body-sm"
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

      <section className="surface-card space-y-4 p-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="typo-h3">{t('valueOptionsTitle')}</h2>
            <p className="typo-body-sm text-muted-foreground">
              {selectedAttribute
                ? t('valueOptionsDescriptionSelected', { name: selectedAttribute.name })
                : t('valueOptionsDescription')}
            </p>
          </div>
          {selectedAttribute && (
            <button
              type="button"
              onClick={() => void loadValueOptions(selectedAttribute)}
              className="border-soft rounded-md px-3 py-2 typo-body-sm hover:bg-secondary"
            >
              {t('refreshValueOptions')}
            </button>
          )}
        </div>
        {!selectedAttribute && (
          <p className="border-soft border-dashed p-4 text-center typo-body-sm text-muted-foreground">
            {t('selectAttributeForValues')}
          </p>
        )}
        {selectedAttribute && loadingValues && (
          <p className="p-4 text-center typo-body-sm text-muted-foreground">{t('loadingValueOptions')}</p>
        )}
        {selectedAttribute && !loadingValues && valueOptions.length === 0 && (
          <p className="border-soft border-dashed p-4 text-center typo-body-sm text-muted-foreground">
            {t('emptyValueOptions')}
          </p>
        )}
        {selectedAttribute && !loadingValues && valueOptions.length > 0 && (
          <div className="space-y-3">
            {valueOptions.map((option) => (
              <article key={option.value} className="space-y-3 surface-card p-3">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <label className="space-y-1">
                    <span className="typo-label text-muted-foreground">{t('valueCode')}</span>
                    <input
                      value={option.value}
                      readOnly
                      className="w-full field-soft px-3 py-2 typo-body-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="typo-label text-muted-foreground">{t('displayValue')}</span>
                    <input
                      value={valueOptionDrafts[option.value] ?? ''}
                      onChange={(event) => handleValueOptionDraftChange(option.value, event.target.value)}
                      className="w-full field-soft px-3 py-2 typo-body-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveValueOption(option)}
                    className="rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground"
                  >
                    {t('saveValueOption')}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-2">
                    <h3 className="typo-label text-muted-foreground">
                      {t('linkedProducts', { count: option.productCount })}
                    </h3>
                    <EntitySelector
                      type="product"
                      selectedIds={option.products.map((product) => product.id)}
                      selectedItems={option.products.map((product) => ({
                        id: product.id,
                        label: product.name,
                        sublabel: product.slug,
                      }))}
                      onChange={(nextProductIds) => handleLinkedProductsChange(option, nextProductIds)}
                      placeholder={t('productSearchPlaceholder')}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="admin-surface overflow-x-auto">
        <table className="w-full typo-body-sm">
          <thead className="admin-table-head">
            <tr>
              <th className="px-4 py-3 text-left">{t('code')}</th>
              <th className="px-4 py-3 text-left">{t('name')}</th>
              <th className="px-4 py-3 text-left">{t('parent')}</th>
              <th className="px-4 py-3 text-left">{t('related')}</th>
              <th className="px-4 py-3 text-right">{t('delete')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attributes.map((attribute) => (
              <tr
                key={attribute.id}
                className="cursor-pointer hover:bg-secondary/30"
                onClick={() => {
                  setForm(toForm(attribute));
                  void loadValueOptions(attribute);
                }}
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
          <AdminEmptyState title={t('empty')} className="rounded-none border-0" />
        )}
      </div>
    </div>
  );
}
