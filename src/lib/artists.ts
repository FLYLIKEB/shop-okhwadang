export interface Artist {
  slug: string;
  name: string;
  nameKo: string;
  clay: string;
  workshop: string;
  productCount: number;
  bio: string;
  story: string[];
  specialty: string;
}

export const ARTISTS: Artist[] = [
  {
    slug: 'master-chen',
    name: '陳師傅',
    nameKo: '진사부',
    clay: '주니',
    workshop: '의흥',
    productCount: 12,
    bio: '40년 경력의 의흥 주니 전문 장인',
    story: [
      '진사부는 의흥 도예 명가에서 태어나 열다섯 살부터 아버지 곁에서 흙을 배웠습니다.',
      '주니(朱泥)의 붉은 기운을 가장 잘 살린다는 평가를 받으며, 그의 호는 자연의 결을 따른다는 뜻의 순결(順結)입니다.',
      '현재 의흥 공방에서 전통 방식만을 고집하며, 한 점 한 점 손으로 빚어냅니다.',
    ],
    specialty: '주니 자사호',
  },
  {
    slug: 'master-li',
    name: '李師傅',
    nameKo: '이사부',
    clay: '단니',
    workshop: '의흥',
    productCount: 8,
    bio: '단니 재료 연구 30년, 의흥 단니의 권위자',
    story: [
      '이사부는 단니(段泥)의 황금빛 토질을 연구하는 데 30년을 바쳤습니다.',
      '광산 선별부터 배합, 소성 온도까지 직접 관리하며, 균일하고 깊은 발색을 구현합니다.',
      '그의 다관은 뚜껑과 본체의 유격이 머리카락 한 올 수준으로 알려져 있습니다.',
    ],
    specialty: '단니 다관',
  },
  {
    slug: 'master-wang',
    name: '王師傅',
    nameKo: '왕사부',
    clay: '자니',
    workshop: '의흥',
    productCount: 15,
    bio: '자니 명장, 전통 형태 복원 프로젝트 주도',
    story: [
      '왕사부는 명나라 시대 고전 형태를 현대적으로 복원하는 작업에 전념해 왔습니다.',
      '자니(紫泥)의 깊은 보라빛을 최대한 끌어내기 위해 이중 소성 기법을 개발했습니다.',
      '의흥 박물관과 협력하여 전통 형태 자료집 편찬에도 참여한 학자적 장인입니다.',
    ],
    specialty: '자니 고전형 자사호',
  },
  {
    slug: 'master-zhao',
    name: '趙師傅',
    nameKo: '조사부',
    clay: '흑니',
    workshop: '의흥',
    productCount: 6,
    bio: '흑니 전문 신예 장인, 현대적 감각의 전통 계승',
    story: [
      '조사부는 의흥 도예 학교 수석 졸업 후 흑니(黑泥) 연구에 전념한 신예 장인입니다.',
      '전통 형태에 현대적 선을 접목하는 시도로 젊은 다인들 사이에서 주목받고 있습니다.',
      '스승 왕사부에게 소성 기술을 전수받아 독자적인 광택 처리 기법을 발전시켰습니다.',
    ],
    specialty: '흑니 현대형 자사호',
  },
];

export function getArtistBySlug(slug: string): Artist | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}

export const CLAY_FILTERS = ['전체', '주니', '단니', '자니', '흑니'] as const;
export type ClayFilter = (typeof CLAY_FILTERS)[number];
