'use client';

import { NumberField, StringField, createContentUpdater } from '../FormFields';

interface JournalPreviewFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function JournalPreviewFields({ content, onChange }: JournalPreviewFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField
        label="제목"
        value={(content.title as string) ?? ''}
        onChange={(v) => update('title', v)}
        placeholder="저널"
      />
      <StringField
        label="제목 (EN)"
        value={(content.title_en as string) ?? ''}
        onChange={(v) => update('title_en', v)}
        placeholder="영문 제목"
      />
      <NumberField
        label="표시 개수"
        value={(content.limit as number) ?? 6}
        onChange={(v) => update('limit', v)}
      />
      <StringField
        label="전체 보기 링크"
        value={(content.more_href as string) ?? ''}
        onChange={(v) => update('more_href', v)}
        placeholder="/journal"
      />
    </>
  );
}
