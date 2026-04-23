'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { HERO_TEMPLATE_OPTIONS } from '../blockConfig';

interface HeroBannerFieldsProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

interface Slide {
  title: string;
  title_en?: string;
  subtitle?: string;
  subtitle_en?: string;
  image_url?: string;
  bg_color?: string;
  cta_text?: string;
  cta_text_en?: string;
  cta_url?: string;
}

export default function HeroBannerFields({ content, onChange }: HeroBannerFieldsProps) {
  const update = createContentUpdater(content, onChange);
  const slides = (content.slides as Slide[]) ?? [];

  const addSlide = () => {
    update('slides', [
      ...slides,
      { title: '', subtitle: '', image_url: '', bg_color: '#1B3A4B', cta_text: '', cta_url: '' },
    ]);
  };

  const removeSlide = (index: number) => {
    update('slides', slides.filter((_, i) => i !== index));
  };

  const updateSlide = (index: number, key: keyof Slide, value: string) => {
    const newSlides = slides.map((s, i) => (i === index ? { ...s, [key]: value } : s));
    update('slides', newSlides);
  };

  return (
    <>
      <StringField label="제목" value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label="제목 (EN)" value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder="영문 제목" />
      <StringField label="부제목" value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label="부제목 (EN)" value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder="영문 부제목" />
      <StringField label="설명 (Markdown 지원)" value={(content.description as string) ?? ''} onChange={(v) => update('description', v)} multiline placeholder="**굵게**, *기울임*, **11** → 11 볼드 등 Markdown 포맷 사용 가능" />
      <StringField label="설명 (EN)" value={(content.description_en as string) ?? ''} onChange={(v) => update('description_en', v)} multiline placeholder="영문 설명" />
      <StringField label="이미지 URL" value={(content.image_url as string) ?? ''} onChange={(v) => update('image_url', v)} placeholder="https://..." />
      <StringField label="CTA 텍스트" value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label="CTA 텍스트 (EN)" value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder="영문 CTA" />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <SelectField
        label="템플릿"
        value={(content.template as string) ?? 'fullscreen'}
        options={HERO_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      {(content.template as string) === 'slider' && (
        <div className="space-y-3 rounded-md border border-input p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">슬라이드 목록</label>
            <button
              type="button"
              onClick={addSlide}
              className="text-xs text-primary hover:underline"
            >
              + 슬라이드 추가
            </button>
          </div>
          {slides.length === 0 && (
            <p className="text-xs text-muted-foreground">슬라이드가 없습니다. 추가 버튼을 눌러 추가하세요.</p>
          )}
          {slides.map((slide, index) => (
            <div key={index} className="space-y-2 rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">슬라이드 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  삭제
                </button>
              </div>
              <StringField label="제목" value={slide.title} onChange={(v) => updateSlide(index, 'title', v)} />
              <StringField label="제목 (EN)" value={slide.title_en ?? ''} onChange={(v) => updateSlide(index, 'title_en', v)} placeholder="영문 제목" />
              <StringField label="부제목" value={slide.subtitle ?? ''} onChange={(v) => updateSlide(index, 'subtitle', v)} />
              <StringField label="부제목 (EN)" value={slide.subtitle_en ?? ''} onChange={(v) => updateSlide(index, 'subtitle_en', v)} placeholder="영문 부제목" />
              <StringField label="이미지 URL" value={slide.image_url ?? ''} onChange={(v) => updateSlide(index, 'image_url', v)} />
              <StringField label="배경색" value={slide.bg_color ?? '#1B3A4B'} onChange={(v) => updateSlide(index, 'bg_color', v)} />
              <StringField label="CTA 텍스트" value={slide.cta_text ?? ''} onChange={(v) => updateSlide(index, 'cta_text', v)} />
              <StringField label="CTA 텍스트 (EN)" value={slide.cta_text_en ?? ''} onChange={(v) => updateSlide(index, 'cta_text_en', v)} placeholder="영문 CTA" />
              <StringField label="CTA URL" value={slide.cta_url ?? ''} onChange={(v) => updateSlide(index, 'cta_url', v)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
