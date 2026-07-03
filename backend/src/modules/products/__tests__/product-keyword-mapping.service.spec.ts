import { ProductNoticeInfoType } from '../dto/create-product.dto';
import { ProductKeywordMappingService } from '../product-keyword-mapping.service';

describe('ProductKeywordMappingService', () => {
  const service = new ProductKeywordMappingService();

  it('normalizes product names before matching aliases and units', () => {
    const result = service.analyzeProductName('옥화당 (老段泥) 120 mL');

    expect(result.normalizedName).toBe('옥화당 老段泥 120 ml');
    expect(result.attributes).toEqual([
      expect.objectContaining({ code: 'clay_type', value: 'old_duanni', displayValue: '노단니' }),
    ]);
    expect(result.options).toEqual([
      expect.objectContaining({ name: '용량', value: '120ml' }),
    ]);
  });

  it('prefers more specific clay keywords such as 노단니 over 단니', () => {
    const result = service.analyzeProductName('옥화당 자사호 황룡산 노단니 연자호 110cc');

    expect(result.category).toEqual(expect.objectContaining({ slug: 'teapot', displayName: '자사호' }));
    expect(result.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'old_duanni', displayValue: '노단니' }),
      expect.objectContaining({ code: 'teapot_shape', value: 'lianzi', displayValue: '연자호' }),
      expect.objectContaining({ code: 'clay_origin', value: 'huanglongshan', displayValue: '황룡산' }),
    ]));
    expect(result.attributes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'duanni' }),
    ]));
    expect(result.warnings.join(' ')).toContain('단니');
    expect(result.noticeInfoType).toBe(ProductNoticeInfoType.TEAWARE);
    expect(result.options).toEqual([expect.objectContaining({ name: '용량', value: '110cc' })]);
  });

  it('extracts all deterministic mappings from a SmartStore teapot product name', () => {
    const result = service.analyzeProductName('옥화당 자사호 황룡산 강파니 방고호 130cc');

    expect(result).toMatchObject({
      category: { slug: 'teapot' },
      noticeInfoType: ProductNoticeInfoType.TEAWARE,
    });
    expect(result.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'jiangponi' }),
      expect.objectContaining({ code: 'teapot_shape', value: 'fanggu' }),
      expect.objectContaining({ code: 'clay_origin', value: 'huanglongshan' }),
    ]));
    expect(result.options).toEqual([expect.objectContaining({ value: '130cc' })]);
  });

  it('maps tea names to tea notice information', () => {
    const result = service.analyzeProductName('옥화당 보이차 생차 200g');

    expect(result.category).toEqual(expect.objectContaining({ slug: 'puerh-tea' }));
    expect(result.noticeInfoType).toBe(ProductNoticeInfoType.TEA);
  });
});
