import { Injectable } from '@nestjs/common';
import { ProductNoticeInfoType, ProductOptionInputDto } from './dto/create-product.dto';

export type KeywordMappingTargetType = 'category' | 'attribute' | 'option' | 'noticeInfo';

export interface ProductKeywordAttributeMapping {
  code: string;
  value: string;
  displayValue: string;
  keyword: string;
}

export interface ProductKeywordCategoryMapping {
  slug: string;
  displayName: string;
  keyword: string;
}

export interface ProductKeywordOptionMapping extends ProductOptionInputDto {
  keyword: string;
}

export interface ProductKeywordMappingResult {
  normalizedName: string;
  category?: ProductKeywordCategoryMapping;
  attributes: ProductKeywordAttributeMapping[];
  options: ProductKeywordOptionMapping[];
  noticeInfoType?: ProductNoticeInfoType;
  warnings: string[];
}

interface BaseKeywordRule {
  keywords: string[];
  priority: number;
}

interface CategoryKeywordRule extends BaseKeywordRule {
  type: 'category';
  slug: string;
  displayName: string;
}

interface AttributeKeywordRule extends BaseKeywordRule {
  type: 'attribute';
  code: string;
  value: string;
  displayValue: string;
}

interface NoticeInfoKeywordRule extends BaseKeywordRule {
  type: 'noticeInfo';
  noticeInfoType: ProductNoticeInfoType;
}

type StaticKeywordRule = CategoryKeywordRule | AttributeKeywordRule | NoticeInfoKeywordRule;

interface MatchedRule<TRule extends StaticKeywordRule> {
  rule: TRule;
  keyword: string;
  index: number;
}

const STATIC_RULES: StaticKeywordRule[] = [
  category(['자사호', '차호', '다관'], 100, 'teapot', '자사호'),
  category(['개완'], 95, 'gaiwan', '개완'),
  category(['공도배', '숙우'], 95, 'fairness-cup', '공도배'),
  category(['차판', '다반'], 95, 'tea-tray', '차판'),
  category(['찻잔', '다완', '잔', '배'], 80, 'teacup', '찻잔'),
  category(['보이차'], 100, 'puerh-tea', '보이차'),
  category(['생차'], 95, 'sheng-puerh', '생차'),
  category(['숙차'], 95, 'shou-puerh', '숙차'),
  category(['백차', '백모단', '수미'], 90, 'white-tea', '백차'),
  category(['우롱차', '암차', '철관음'], 90, 'oolong-tea', '우롱차'),

  attribute('clay_type', 'hongwei_zhuni', '홍위주니', ['홍위주니'], 230),
  attribute('clay_type', 'benshan_luni', '본산녹니', ['본산녹니'], 230),
  attribute('clay_type', 'old_qingshuini', '노청수니', ['노청수니'], 230),
  attribute('clay_type', 'old_duanni', '노단니', ['노단니', '老段泥', 'old duanni'], 230),
  attribute('clay_type', 'tiechengzao_hongni', '철성조홍니', ['철성조홍니'], 230),
  attribute('clay_type', 'old_zini', '노자니', ['노자니'], 230),
  attribute('clay_type', 'dicaoqing', '저조청', ['저조청', '底槽青'], 220),
  attribute('clay_type', 'qinghuini', '청회니', ['청회니', '青灰泥'], 220),
  attribute('clay_type', 'qingshuini', '청수니', ['청수니'], 210),
  attribute('clay_type', 'jiangponi', '강파니', ['강파니'], 210),
  attribute('clay_type', 'yubaini', '옥백니', ['옥백니'], 210),
  attribute('clay_type', 'duanni', '단니', ['단니', '段泥', 'duanni'], 180),
  attribute('clay_type', 'zhuni', '주니', ['주니', '朱泥', 'zhuni'], 180),
  attribute('clay_type', 'hongni', '홍니', ['홍니', '紅泥', 'hongni'], 180),
  attribute('clay_type', 'zini', '자니', ['자니', '紫泥', 'zini'], 180),
  attribute('clay_type', 'heini', '흑니', ['흑니', '黑泥'], 180),
  attribute('clay_type', 'luni', '녹니', ['녹니', '綠泥'], 170),
  attribute('clay_type', 'wuni', '오니', ['오니'], 170),

  attribute('teapot_shape', 'pinggai_lianzi', '평개연자호', ['평개연자호'], 230),
  attribute('teapot_shape', 'lianzi', '연자호', ['연자호', '연자', '蓮子壺'], 200),
  attribute('teapot_shape', 'xishi', '서시', ['서시', '西施'], 200),
  attribute('teapot_shape', 'shipiao', '석표', ['석표', '石瓢'], 200),
  attribute('teapot_shape', 'fanggu', '방고호', ['방고호', '방고', '仿古'], 200),
  attribute('teapot_shape', 'shuiping', '수평', ['수평', '水平'], 200),
  attribute('teapot_shape', 'longdan', '용단', ['용단', '龍蛋'], 200),
  attribute('teapot_shape', 'banyue', '반월', ['반월', '半月'], 200),
  attribute('teapot_shape', 'xubian', '허편', ['허편', '虛扁'], 200),
  attribute('teapot_shape', 'hanwa', '한와호', ['한와호'], 200),
  attribute('teapot_shape', 'tieqiu', '철구호', ['철구호'], 200),
  attribute('teapot_shape', 'banhu', '반호', ['반호'], 200),
  attribute('teapot_shape', 'julunzhu', '거륜주', ['거륜주'], 200),
  attribute('teapot_shape', 'yixing', '이형호', ['이형호'], 200),

  attribute('craft_method', 'handmade', '전수공', ['전수공'], 150),
  attribute('clay_origin', 'huanglongshan', '황룡산', ['황룡산'], 150),

  notice(['자사호', '차호', '다관', '개완', '찻잔', '다완', '공도배', '숙우', '차판', '다반'], 100, ProductNoticeInfoType.TEAWARE),
  notice(['보이차', '생차', '숙차', '백차', '우롱차', '홍차', '녹차'], 100, ProductNoticeInfoType.TEA),
];

@Injectable()
export class ProductKeywordMappingService {
  analyzeProductName(productName: string | null | undefined): ProductKeywordMappingResult {
    const normalizedName = this.normalizeProductName(productName ?? '');
    if (!normalizedName) {
      return { normalizedName, attributes: [], options: [], warnings: [] };
    }

    const warnings: string[] = [];
    const category = this.selectCategory(normalizedName, warnings);
    const attributes = this.selectAttributes(normalizedName, warnings);
    const noticeInfoType = this.selectNoticeInfoType(normalizedName);
    const options = this.extractOptions(normalizedName);

    return {
      normalizedName,
      ...(category ? { category } : {}),
      attributes,
      options,
      ...(noticeInfoType ? { noticeInfoType } : {}),
      warnings,
    };
  }

  normalizeProductName(value: string): string {
    return value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[()[\]{}【】<>〈〉《》]/g, ' ')
      .replace(/[·ㆍ_/|,+:;~-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private selectCategory(normalizedName: string, warnings: string[]): ProductKeywordCategoryMapping | undefined {
    const matches = this.findMatches<CategoryKeywordRule>(normalizedName, 'category');
    if (!matches.length) return undefined;
    const selected = this.selectBest(matches);
    const conflicted = matches.filter((match) => match.rule.slug !== selected.rule.slug);
    conflicted.forEach((match) => {
      warnings.push(`카테고리 후보 '${match.rule.displayName}'은 '${selected.rule.displayName}'보다 우선순위가 낮아 제외되었습니다.`);
    });
    return {
      slug: selected.rule.slug,
      displayName: selected.rule.displayName,
      keyword: selected.keyword,
    };
  }

  private selectAttributes(normalizedName: string, warnings: string[]): ProductKeywordAttributeMapping[] {
    const matches = this.dedupeAttributeMatches(this.findMatches<AttributeKeywordRule>(normalizedName, 'attribute'));
    const byCode = new Map<string, Array<MatchedRule<AttributeKeywordRule>>>();
    matches.forEach((match) => {
      const items = byCode.get(match.rule.code) ?? [];
      items.push(match);
      byCode.set(match.rule.code, items);
    });

    const attributes = [...byCode.entries()].map(([code, items]) => {
      const selected = this.selectBest(items);
      items
        .filter((match) => match.rule.value !== selected.rule.value)
        .forEach((match) => {
          warnings.push(`속성 '${code}' 후보 '${match.rule.displayValue}'은 '${selected.rule.displayValue}'보다 우선순위가 낮아 제외되었습니다.`);
        });
      return {
        code: selected.rule.code,
        value: selected.rule.value,
        displayValue: selected.rule.displayValue,
        keyword: selected.keyword,
      };
    });

    const capacity = this.extractCapacityAttribute(normalizedName);
    if (capacity && !attributes.some((attribute) => attribute.code === 'capacity')) {
      attributes.push(capacity);
    }
    return attributes;
  }

  private dedupeAttributeMatches(matches: Array<MatchedRule<AttributeKeywordRule>>): Array<MatchedRule<AttributeKeywordRule>> {
    const byValue = new Map<string, Array<MatchedRule<AttributeKeywordRule>>>();
    matches.forEach((match) => {
      const key = `${match.rule.code}\u0000${match.rule.value}`;
      const items = byValue.get(key) ?? [];
      items.push(match);
      byValue.set(key, items);
    });
    return [...byValue.values()].map((items) => this.selectBest(items));
  }

  private extractCapacityAttribute(normalizedName: string): ProductKeywordAttributeMapping | null {
    const capacityMatch = /\b(\d{2,4})\s?(cc|ml)\b/i.exec(normalizedName);
    if (!capacityMatch) return null;
    const value = `${capacityMatch[1]}${capacityMatch[2].toLowerCase()}`;
    return {
      code: 'capacity',
      value,
      displayValue: value,
      keyword: capacityMatch[0],
    };
  }

  private selectNoticeInfoType(normalizedName: string): ProductNoticeInfoType | undefined {
    const matches = this.findMatches<NoticeInfoKeywordRule>(normalizedName, 'noticeInfo');
    return matches.length > 0 ? this.selectBest(matches).rule.noticeInfoType : undefined;
  }

  private extractOptions(_normalizedName: string): ProductKeywordOptionMapping[] {
    // 상품명 키워드는 재고 정보를 갖지 않으므로 구매 옵션을 만들지 않는다.
    // 용량 텍스트는 capacity attribute/noticeInfo 로만 반영한다. (issue #1054)
    return [];
  }

  private findMatches<TRule extends StaticKeywordRule>(normalizedName: string, type: TRule['type']): Array<MatchedRule<TRule>> {
    const matches: Array<MatchedRule<TRule>> = [];
    STATIC_RULES
      .filter((rule): rule is TRule => rule.type === type)
      .forEach((rule) => {
        rule.keywords.forEach((keyword) => {
          const normalizedKeyword = this.normalizeProductName(keyword);
          if (!normalizedKeyword) return;
          const index = normalizedName.indexOf(normalizedKeyword);
          if (index >= 0) {
            matches.push({ rule, keyword, index });
          }
        });
      });
    return matches;
  }

  private selectBest<TRule extends StaticKeywordRule>(matches: Array<MatchedRule<TRule>>): MatchedRule<TRule> {
    return [...matches].sort((a, b) => {
      if (b.rule.priority !== a.rule.priority) return b.rule.priority - a.rule.priority;
      const bLength = this.normalizeProductName(b.keyword).length;
      const aLength = this.normalizeProductName(a.keyword).length;
      if (bLength !== aLength) return bLength - aLength;
      return a.index - b.index;
    })[0];
  }
}

function category(keywords: string[], priority: number, slug: string, displayName: string): CategoryKeywordRule {
  return { type: 'category', keywords, priority, slug, displayName };
}

function attribute(
  code: string,
  value: string,
  displayValue: string,
  keywords: string[],
  priority: number,
): AttributeKeywordRule {
  return { type: 'attribute', keywords, priority, code, value, displayValue };
}

function notice(keywords: string[], priority: number, noticeInfoType: ProductNoticeInfoType): NoticeInfoKeywordRule {
  return { type: 'noticeInfo', keywords, priority, noticeInfoType };
}
