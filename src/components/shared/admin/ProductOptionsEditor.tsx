'use client';

import { localMessage } from '@/utils/localMessages';
export interface ProductOptionDraft {
  id?: number;
  name: string;
  value: string;
  priceAdjustment: number;
  stock: number;
}

interface ProductOptionsEditorProps {
  options: ProductOptionDraft[];
  onChange: (options: ProductOptionDraft[]) => void;
}

const emptyOption = (): ProductOptionDraft => ({
  name: '',
  value: '',
  priceAdjustment: 0,
  stock: 0,
});

export default function ProductOptionsEditor({
  options,
  onChange,
}: ProductOptionsEditorProps) {
  const update = (index: number, field: keyof ProductOptionDraft, value: string | number) => {
    const next = options.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt,
    );
    onChange(next);
  };

  const add = () => onChange([...options, emptyOption()]);

  const remove = (index: number) => onChange(options.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{localMessage('admin.localization.kinds.productOption')}</p>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
        >
          {localMessage('adminEnglish.addOption')}
        </button>
      </div>

      {options.length === 0 && (
        <p className="text-sm text-muted-foreground">{localMessage('adminEnglish.noOptionsYet')}</p>
      )}

      {options.map((opt, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 rounded-lg border p-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{localMessage('adminEnglish.optionName')}</label>
            <input
              type="text"
              value={opt.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder={localMessage('adminEnglish.eGColor')}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{localMessage('adminEnglish.value')}</label>
            <input
              type="text"
              value={opt.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              placeholder={localMessage('adminEnglish.eGRed')}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{localMessage('adminEnglish.priceAdjustment')}</label>
            <input
              type="number"
              value={opt.priceAdjustment}
              onChange={(e) => update(i, 'priceAdjustment', Number(e.target.value))}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 block text-xs text-muted-foreground">{localMessage('admin.productForm.stock')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={opt.stock}
                onChange={(e) => update(i, 'stock', Number(e.target.value))}
                className="w-full rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded px-2 text-destructive hover:bg-destructive/10"
              >
                x
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
