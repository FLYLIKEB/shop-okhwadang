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

    const content2: Record<string, unknown> = { title: '제목', title_en: null };
    const result2 = applyLocaleToContent(content2, 'en') as Record<string, unknown>;
    expect(result2.title).toBe('제목');
  });

  it('non-object 값은 그대로 반환', () => {
    expect(applyLocaleToContent('string', 'en')).toBe('string');
    expect(applyLocaleToContent(42, 'en')).toBe(42);
    expect(applyLocaleToContent(null, 'en')).toBe(null);
  });

  it('순환 참조가 있어도 스택 오버플로 없이 반환', () => {
    const content: Record<string, unknown> = { title: '제목', title_en: 'Title' };
    content.self = content;
    expect(() => applyLocaleToContent(content, 'en')).not.toThrow();
    const result = applyLocaleToContent(content, 'en') as Record<string, unknown>;
    expect(result.title).toBe('Title');
  });

  it('깊이 16을 초과하면 이후 하위는 원본 유지 (크래시 없음)', () => {
    const root: Record<string, unknown> = { title: 't0', title_en: 'T0' };
    let cur = root;
    for (let i = 1; i < 25; i++) {
      const next: Record<string, unknown> = { title: `t${i}`, title_en: `T${i}` };
      cur.child = next;
      cur = next;
    }
    expect(() => applyLocaleToContent(root, 'en')).not.toThrow();
  });

  it('Date/Map/Buffer 같은 non-plain object는 원본 유지', () => {
    const date = new Date('2024-01-01');
    const content = { title: '제목', title_en: 'Title', updatedAt: date };
    const result = applyLocaleToContent(content, 'en') as typeof content;
    expect(result.title).toBe('Title');
    expect(result.updatedAt).toBe(date);
  });

  it('2-pass: 객체 필드와 같은 base 이름의 _en 오버라이드가 객체보다 우선', () => {
    const content = {
      config: { nested: '중첩' },
      config_en: 'English config',
    };
    const result = applyLocaleToContent(content, 'en') as Record<string, unknown>;
    expect(result.config).toBe('English config');
  });
});
