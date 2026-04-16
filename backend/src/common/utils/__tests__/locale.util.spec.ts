import { applyLocale, applyLocaleToContent } from '../locale.util';

describe('applyLocale', () => {
  it('locale이 ko이거나 undefined면 원본 반환', () => {
    const entity = { title: '제목', titleEn: 'Title' };
    expect(applyLocale(entity, 'ko', ['title'])).toEqual(entity);
    expect(applyLocale(entity, undefined, ['title'])).toEqual(entity);
  });

  it('en일 때 titleEn → title로 매핑', () => {
    const entity = { title: '제목', titleEn: 'Title' };
    const result = applyLocale(entity, 'en', ['title']);
    expect(result.title).toBe('Title');
  });

  it('locale 변형이 null/undefined면 원본 유지', () => {
    const entity = { title: '제목', titleEn: null };
    const result = applyLocale(entity, 'en', ['title']);
    expect(result.title).toBe('제목');
  });

  it('지원하지 않는 locale이면 원본 반환', () => {
    const entity = { title: '제목', titleEn: 'Title' };
    expect(applyLocale(entity, 'fr', ['title'])).toEqual(entity);
  });
});

describe('applyLocaleToContent', () => {
  it('locale이 ko이거나 undefined면 원본 반환', () => {
    const content = { title: '제목', title_en: 'Title' };
    expect(applyLocaleToContent(content, 'ko')).toEqual(content);
    expect(applyLocaleToContent(content, undefined)).toEqual(content);
  });

  it('en일 때 title_en이 title로 매핑됨', () => {
    const content = { title: '제목', title_en: 'Title' };
    const result = applyLocaleToContent(content, 'en');
    expect(result.title).toBe('Title');
    expect(result.title_en).toBe('Title');
  });

  it('다른 필드도 매핑 (subtitle_en, cta_text_en, description_en)', () => {
    const content = {
      title: '제목',
      title_en: 'Title',
      subtitle: '부제목',
      subtitle_en: 'Subtitle',
      cta_text: '버튼',
      cta_text_en: 'Button',
      description: '설명',
      description_en: 'Description',
    };
    const result = applyLocaleToContent(content, 'en');
    expect(result.title).toBe('Title');
    expect(result.subtitle).toBe('Subtitle');
    expect(result.cta_text).toBe('Button');
    expect(result.description).toBe('Description');
  });

  it('slides 배열 내부의 title_en도 재귀 처리', () => {
    const content = {
      template: 'slider',
      slides: [
        { title: '슬라이드1', title_en: 'Slide 1', cta_text: '보기', cta_text_en: 'View' },
        { title: '슬라이드2', title_en: 'Slide 2' },
      ],
    };
    const result = applyLocaleToContent(content, 'en') as typeof content;
    expect(result.slides[0].title).toBe('Slide 1');
    expect(result.slides[0].cta_text).toBe('View');
    expect(result.slides[1].title).toBe('Slide 2');
  });

  it('*_en 값이 빈 문자열/null이면 base 유지', () => {
    const content = { title: '제목', title_en: '' };
    const result = applyLocaleToContent(content, 'en') as typeof content;
    expect(result.title).toBe('제목');
  });

  it('non-object 값은 그대로 반환', () => {
    expect(applyLocaleToContent('string', 'en')).toBe('string');
    expect(applyLocaleToContent(42, 'en')).toBe(42);
    expect(applyLocaleToContent(null, 'en')).toBe(null);
  });
});
