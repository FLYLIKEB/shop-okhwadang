'use client';

import { localMessage } from '@/utils/localMessages';
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
        label={localMessage('popups.title')}
        value={(content.title as string) ?? ''}
        onChange={(v) => update('title', v)}
        placeholder={localMessage('adminEnglish.journal')}
      />
      <StringField
        label={localMessage('adminEnglish.titleEn')}
        value={(content.title_en as string) ?? ''}
        onChange={(v) => update('title_en', v)}
        placeholder={localMessage('adminEnglish.englishTitle')}
      />
      <NumberField
        label={localMessage('adminEnglish.itemCount')}
        value={(content.limit as number) ?? 6}
        onChange={(v) => update('limit', v)}
      />
      <StringField
        label={localMessage('adminEnglish.viewAllLink')}
        value={(content.more_href as string) ?? ''}
        onChange={(v) => update('more_href', v)}
        placeholder="/journal"
      />
    </>
  );
}
