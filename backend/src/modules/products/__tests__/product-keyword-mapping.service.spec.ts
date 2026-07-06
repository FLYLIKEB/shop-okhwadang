import { ProductNoticeInfoType } from '../dto/create-product.dto';
import { ProductKeywordMappingService } from '../product-keyword-mapping.service';

describe('ProductKeywordMappingService', () => {
  const service = new ProductKeywordMappingService();

  it('normalizes product names before matching aliases and units', () => {
    const result = service.analyzeProductName('옥화당 (老段泥) 120 mL');

    expect(result.normalizedName).toBe('옥화당 老段泥 120 ml');
    expect(result.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'old_duanni', displayValue: '노단니' }),
      expect.objectContaining({ code: 'capacity', value: '120ml', displayValue: '120ml' }),
    ]));
    expect(result.options).toEqual([]);
  });

  it('prefers more specific clay keywords such as 노단니 over 단니', () => {
    const result = service.analyzeProductName('옥화당 자사호 황룡산 노단니 연자호 110cc');

    expect(result.category).toEqual(expect.objectContaining({ slug: 'teapot', displayName: '자사호' }));
    expect(result.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'old_duanni', displayValue: '노단니' }),
      expect.objectContaining({ code: 'teapot_shape', value: 'lianzi', displayValue: '연자호' }),
      expect.objectContaining({ code: 'clay_origin', value: 'huanglongshan', displayValue: '황룡산' }),
      expect.objectContaining({ code: 'capacity', value: '110cc', displayValue: '110cc' }),
    ]));
    expect(result.attributes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'duanni' }),
    ]));
    expect(result.warnings.join(' ')).toContain('단니');
    expect(result.noticeInfoType).toBe(ProductNoticeInfoType.TEAWARE);
    expect(result.options).toEqual([]);
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
      expect.objectContaining({ code: 'capacity', value: '130cc' }),
    ]));
    expect(result.options).toEqual([]);
  });


  it('deduplicates nested shape aliases and keeps only one lower-priority warning', () => {
    const result = service.analyzeProductName('옥화당 자사호 옥백니 평개연자호 135cc');

    expect(result.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'clay_type', value: 'yubaini', displayValue: '옥백니' }),
      expect.objectContaining({ code: 'teapot_shape', value: 'pinggai_lianzi', displayValue: '평개연자호' }),
      expect.objectContaining({ code: 'capacity', value: '135cc', displayValue: '135cc' }),
    ]));
    expect(result.warnings.filter((warning) => warning.includes("후보 '연자호'"))).toHaveLength(1);
  });

  it('maps follow-up SmartStore words from the remote preview sample', () => {
    const cases = [
      ['옥화당 자사호 홍위주니 전수공 반호 90cc', 'hongwei_zhuni', 'banhu'],
      ['옥화당 자사호 황룡산 철성조홍니 거륜주 110cc', 'tiechengzao_hongni', 'julunzhu'],
      ['옥화당 자사호 황룡산 노자니 이형호 120cc', 'old_zini', 'yixing'],
    ] as const;

    cases.forEach(([name, clayValue, shapeValue]) => {
      const result = service.analyzeProductName(name);
      expect(result.attributes).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'clay_type', value: clayValue }),
        expect.objectContaining({ code: 'teapot_shape', value: shapeValue }),
        expect.objectContaining({ code: 'capacity' }),
      ]));
    });
  });

  it('maps tea names to tea notice information', () => {
    const result = service.analyzeProductName('옥화당 보이차 생차 200g');

    expect(result.category).toEqual(expect.objectContaining({ slug: 'puerh-tea' }));
    expect(result.noticeInfoType).toBe(ProductNoticeInfoType.TEA);
  });
});
