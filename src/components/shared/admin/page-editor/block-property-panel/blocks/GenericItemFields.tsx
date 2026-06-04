'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiClient, type UploadedFile } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { NumberField, SelectField, StringField } from '../FormFields';

export interface EditableItem {
  id: string;
}

interface ItemListEditorProps<T extends EditableItem> {
  label: string;
  items: T[];
  createItem: (index: number) => T;
  getTitle: (item: T, index: number) => string;
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, updateItem: (patch: Partial<T>) => void) => ReactNode;
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEditorId() {
  return createId();
}

export function ItemListEditor<T extends EditableItem>({
  label,
  items,
  createItem,
  getTitle,
  onChange,
  renderItem,
}: ItemListEditorProps<T>) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(items.slice(0, 1).map((item) => item.id)));

  const addItem = () => {
    const next = [...items, createItem(items.length)];
    onChange(next);
    setOpenIds(new Set([next[next.length - 1].id]));
  };

  const removeItem = (index: number) => {
    if (window.confirm('이 항목을 삭제하시겠습니까?')) {
      onChange(items.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const updateItem = (index: number, patch: Partial<T>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const toggleOpen = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-input p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <button type="button" onClick={addItem} className="text-xs text-primary hover:underline">+ 항목 추가</button>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">항목이 없습니다. 추가 버튼을 눌러 추가하세요.</p>}
      {items.map((item, index) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} className="space-y-2 rounded-md bg-muted/50 p-2">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => toggleOpen(item.id)} className="min-w-0 flex-1 text-left text-xs font-medium hover:underline">
                {isOpen ? '▾' : '▸'} {getTitle(item, index)}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-xs text-muted-foreground disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-xs text-muted-foreground disabled:opacity-30">↓</button>
                <button type="button" onClick={() => removeItem(index)} className="text-xs text-destructive hover:underline">삭제</button>
              </div>
            </div>
            {isOpen && renderItem(item, index, (patch) => updateItem(index, patch))}
          </div>
        );
      })}
    </div>
  );
}

export function TagListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <StringField
      label={label}
      value={value.join(', ')}
      onChange={(next) => onChange(next.split(',').map((item) => item.trim()).filter(Boolean))}
      placeholder="쉼표로 구분"
    />
  );
}


export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await apiClient.uploadFile<UploadedFile>('/upload/image', file);
      onChange(uploaded.url);
      toast.success('이미지를 업로드했습니다');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <StringField label={label} value={value} onChange={onChange} placeholder="https://..." />
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = '';
        }}
        className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs"
        aria-label={`${label} 업로드`}
      />
      {uploading && <p className="text-xs text-muted-foreground">업로드 중...</p>}
    </div>
  );
}

export { NumberField, SelectField, StringField };

