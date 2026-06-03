'use client';

import { createContentUpdater, StringField } from '../FormFields';

interface SectionHeadingFieldsProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export default function SectionHeadingFields({ content, onChange }: SectionHeadingFieldsProps) {
  const update = createContentUpdater(content, onChange);

  return (
    <>
      <StringField
        label="섹션 라벨"
        value={(content.sectionLabel as string) ?? ''}
        onChange={(value) => update('sectionLabel', value)}
        placeholder="비워두면 기본 i18n 라벨 사용"
      />
      <StringField
        label="섹션 제목"
        value={(content.sectionTitle as string) ?? ''}
        onChange={(value) => update('sectionTitle', value)}
        placeholder="비워두면 기본 i18n 제목 사용"
      />
      <StringField
        label="섹션 설명"
        value={(content.sectionDesc as string) ?? ''}
        onChange={(value) => update('sectionDesc', value)}
        placeholder="비워두면 기본 i18n 설명 사용"
        multiline
      />
    </>
  );
}
