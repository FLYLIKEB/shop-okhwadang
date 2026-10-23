'use client';

import { SelectField, StringField, createContentUpdater } from '../FormFields';
import { ImageUploadField } from './GenericItemFields';
import { localMessage } from '@/utils/localMessages';
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
  image_derivatives?: Record<string, string>;
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

  const updateSlide = (index: number, key: keyof Slide, value: Slide[keyof Slide]) => {
    const newSlides = slides.map((s, i) => (i === index ? { ...s, [key]: value } : s));
    update('slides', newSlides);
  };

  return (
    <>
      <StringField label={localMessage('popups.title')} value={(content.title as string) ?? ''} onChange={(v) => update('title', v)} />
      <StringField label={localMessage('adminEnglish.titleEn')} value={(content.title_en as string) ?? ''} onChange={(v) => update('title_en', v)} placeholder={localMessage('adminEnglish.englishTitle')} />
      <StringField label={localMessage('adminEnglish.subtitle')} value={(content.subtitle as string) ?? ''} onChange={(v) => update('subtitle', v)} />
      <StringField label={localMessage('adminEnglish.subtitleEn')} value={(content.subtitle_en as string) ?? ''} onChange={(v) => update('subtitle_en', v)} placeholder={localMessage('adminEnglish.englishSubtitle')} />
      <StringField label={localMessage('adminEnglish.descriptionMarkdown')} value={(content.description as string) ?? ''} onChange={(v) => update('description', v)} multiline placeholder={localMessage('adminEnglish.markdownSupportedBoldItalic11ForA')} />
      <StringField label={localMessage('adminEnglish.descriptionEn')} value={(content.description_en as string) ?? ''} onChange={(v) => update('description_en', v)} multiline placeholder={localMessage('adminEnglish.englishDescription')} />
      <ImageUploadField
        label={localMessage('admin.imageUpload.label')}
        value={(content.image_url as string) ?? ''}
        onChange={(image_url, image_derivatives) => onChange({ ...content, image_url, image_derivatives })}
        cmsKind="hero"
      />
      <StringField label={localMessage('adminEnglish.ctaText')} value={(content.cta_text as string) ?? ''} onChange={(v) => update('cta_text', v)} />
      <StringField label={localMessage('adminEnglish.ctaTextEn')} value={(content.cta_text_en as string) ?? ''} onChange={(v) => update('cta_text_en', v)} placeholder={localMessage('adminEnglish.englishCta')} />
      <StringField label="CTA URL" value={(content.cta_url as string) ?? ''} onChange={(v) => update('cta_url', v)} />
      <SelectField
        label={localMessage('adminEnglish.template')}
        value={(content.template as string) ?? 'fullscreen'}
        options={HERO_TEMPLATE_OPTIONS}
        onChange={(v) => update('template', v)}
      />
      {(content.template as string) === 'slider' && (
        <div className="space-y-3 rounded-md border border-input p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">{localMessage('adminEnglish.slides')}</label>
            <button
              type="button"
              onClick={addSlide}
              className="text-xs text-primary hover:underline"
            >
              {localMessage('adminEnglish.addSlide')}
            </button>
          </div>
          {slides.length === 0 && (
            <p className="text-xs text-muted-foreground">{localMessage('adminEnglish.noSlidesYetUseAddSlideTo')}</p>
          )}
          {slides.map((slide, index) => (
            <div key={index} className="space-y-2 rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{localMessage('adminEnglish.slide')} {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  {localMessage('popups.delete')}
                </button>
              </div>
              <StringField label={localMessage('popups.title')} value={slide.title} onChange={(v) => updateSlide(index, 'title', v)} />
              <StringField label={localMessage('adminEnglish.titleEn')} value={slide.title_en ?? ''} onChange={(v) => updateSlide(index, 'title_en', v)} placeholder={localMessage('adminEnglish.englishTitle')} />
              <StringField label={localMessage('adminEnglish.subtitle')} value={slide.subtitle ?? ''} onChange={(v) => updateSlide(index, 'subtitle', v)} />
              <StringField label={localMessage('adminEnglish.subtitleEn')} value={slide.subtitle_en ?? ''} onChange={(v) => updateSlide(index, 'subtitle_en', v)} placeholder={localMessage('adminEnglish.englishSubtitle')} />
              <ImageUploadField
                label={localMessage('admin.imageUpload.label')}
                value={slide.image_url ?? ''}
                onChange={(image_url, image_derivatives) => update('slides', slides.map((current, slideIndex) => (
                  slideIndex === index ? { ...current, image_url, image_derivatives } : current
                )))}
                cmsKind="hero"
              />
              <StringField label={localMessage('adminEnglish.backgroundColor')} value={slide.bg_color ?? '#1B3A4B'} onChange={(v) => updateSlide(index, 'bg_color', v)} />
              <StringField label={localMessage('adminEnglish.ctaText')} value={slide.cta_text ?? ''} onChange={(v) => updateSlide(index, 'cta_text', v)} />
              <StringField label={localMessage('adminEnglish.ctaTextEn')} value={slide.cta_text_en ?? ''} onChange={(v) => updateSlide(index, 'cta_text_en', v)} placeholder={localMessage('adminEnglish.englishCta')} />
              <StringField label="CTA URL" value={slide.cta_url ?? ''} onChange={(v) => updateSlide(index, 'cta_url', v)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
