// ============================================================
// 옥화당 (玉花堂) 자사호·보이차·다구 쇼핑몰 시드 데이터
// ============================================================
// 이 파일은 okhwadang-seed.sql의 데이터를 TypeScript 객체로 변환한 것입니다.
// Entity 타입과 1:1 매칭되어 타입 안전성을 보장합니다.

import { ProductStatus } from '../../../modules/products/entities/product.entity';

// ============================================================
// 카테고리 (Category)
// ============================================================
export interface SeedCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  description: string | null;
}

export const categories: SeedCategory[] = [
  // 최상위 카테고리
  {
    id: 1,
    name: '자사호',
    slug: 'teapot',
    parentId: null,
    sortOrder: 1,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>중국 의흥(宜興) 황룡산 자사니</b>로 빚은 전통 다호. <b>600년 도예 역사</b>가 담긴 장인의 손끝에서 태어난 자사호를 만나보세요. 사용하면 사용할수록 차기(茶氣)가 쌓여 맛이 깊어집니다.',
  },
  {
    id: 2,
    name: '보이차',
    slug: 'puerh-tea',
    parentId: null,
    sortOrder: 2,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>운남성(雲南省) 고수차(古樹茶) 산지</b>에서 직수입한 보이차. <b>세월이 빚어낸 깊은 맛과 향</b>을 경험하세요. 생차·숙차·노차로 나누어 만나볼 수 있습니다.',
  },
  {
    id: 3,
    name: '다구',
    slug: 'tea-ware',
    parentId: null,
    sortOrder: 3,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
    description:
      '찻자리를 완성하는 <b>다구 컬렉션</b>. 다완, 다반, 차 도구까지 정성스러운 한 잔을 위한 모든 것. 자사호와 어울리는 다구를 엄선했습니다.',
  },
  {
    id: 4,
    name: '다엽',
    slug: 'tea-leaf',
    parentId: null,
    sortOrder: 4,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '엄선된 <b>찻잎을 소량 단위</b>로 즐기는 다엽 컬렉션. 다양한 산지(반장·빙도·남糯等)와 품종의 차를 만나보세요. 소분으로 다양한 차를 경험해보세요.',
  },

  // 자사호 > 니료별
  {
    id: 10,
    name: '주니',
    slug: 'zhuní',
    parentId: 1,
    sortOrder: 1,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>주철질의 대표 니료</b>로, 적색~황갈색을 띱니다. <b>높은 수축률</b>으로 섬세한 질감이 특징이며, <b>빠른 열전도</b>로 고산 우롱차·홍차에 잘 어울립니다.',
  },
  {
    id: 11,
    name: '자사',
    slug: 'zǐshā',
    parentId: 1,
    sortOrder: 2,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>보라빛 자사(紫砂) 원광 니료</b>로 만든 정통 자사호. <b>뛰어난 기공성(透氣性)</b>으로 보이차·흑차 등 발효차에 최적입니다. 사용하면 할수록 광택이 납니다.',
  },
  {
    id: 12,
    name: '단니',
    slug: 'duānní',
    parentId: 1,
    sortOrder: 3,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>밝은 노란빛의 단니(段泥)</b> 자사호. <b>가벼운 색감</b>에 깨끗한 맛을 내며, <b>녹차·백차·경발효 우롱차</b>에 어울립니다. 차 색감을 감상하기 좋습니다.',
  },
  {
    id: 13,
    name: '흑니',
    slug: 'hēiní',
    parentId: 1,
    sortOrder: 4,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>깊은 흑색의 흑니(黑泥)</b> 자사호. <b>묵직한 존재감</b>과 <b>뛰어난 보온성</b>으로 <b>숙차·흑차</b>를 우리기에 좋습니다. 완전 소성된 표면이 풍격을 더합니다.',
  },
  {
    id: 14,
    name: '청회니',
    slug: 'qīnghuīní',
    parentId: 1,
    sortOrder: 5,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>청회색 톤의 청회니(青灰泥)</b> 자사호. <b>은은한 색감</b>에 단정한 미감을 지니며, <b>생차·백차</b>에 잘 어울립니다. 섬세한 질감이 특징입니다.',
  },

  // 자사호 > 모양별
  {
    id: 20,
    name: '주형',
    slug: 'zhūxíng',
    parentId: 1,
    sortOrder: 6,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>대나무 마디를 본뜬 주형호(竹型壺)</b>. 곧고 단정한 조형미와 자연의 생명력이 담긴 전통 조형입니다. <b>수직 선</b>이 현대적 감각을 더합니다.',
  },
  {
    id: 21,
    name: '석표',
    slug: 'shípião',
    parentId: 1,
    sortOrder: 7,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>바가지 모양의 석표호(石瓢壺)</b>. <b>삼각 구도의 안정감</b>과 힘 있는 선이 특징인 자사호의 <b>대표 조형</b>입니다. 삼각 뚜껑 손잡이가 독특합니다.',
  },
  {
    id: 22,
    name: '서시',
    slug: 'xīshī',
    parentId: 1,
    sortOrder: 8,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>미인 서시(西施)에서 이름을 딴 서시호</b>. <b>풍만하고 부드러운 곡선</b>이 여성적 아름다움을 표현한 <b>대표적 원형호</b>입니다. 쥐리기가 좋아 입문자 추천.',
  },
  {
    id: 23,
    name: '편평',
    slug: 'biānpíng',
    parentId: 1,
    sortOrder: 9,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>납작한 원판 형태의 편평호(扁平壺)</b>. <b>넓은 바닥과 낮은 몸체</b>로 찻잎이 고르게 펼쳐져 <b>맛의 균형</b>이 좋습니다. 다반 위 배치에 적합합니다.',
  },

  // 보이차 > 종류별
  {
    id: 30,
    name: '생차 (生茶)',
    slug: 'sheng-puerh',
    parentId: 2,
    sortOrder: 1,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>자연 발효 방식의 생차(生茶)</b>. 시간이 지날수록 맛이 변화하며, 초기 <b>쓴맛과 떫은맛</b>이 세월과 함께 <b>깊은 감미</b>로 바뀝니다. <b>반장·빙도</b> 등 유명 산지 생차를 만나보세요.',
  },
  {
    id: 31,
    name: '숙차 (熟茶)',
    slug: 'shou-puerh',
    parentId: 2,
    sortOrder: 2,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
    description:
      '<b>악퇴 발효를 거친 숙차(熟茶)</b>. <b>부드럽고 달콤한 맛</b>으로 바로 음용하기 좋으며, <b>대추·감초 향</b>이 특징입니다. <b>대익 7572</b> 등 입문 추천 숙차를 엄선했습니다.',
  },
  {
    id: 32,
    name: '노차 (老茶)',
    slug: 'aged-puerh',
    parentId: 2,
    sortOrder: 3,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '<b>10년 이상 숙성된 노차(老茶)</b>. 오랜 세월이 만들어낸 <b>깊은 진향(陳香)</b>과 <b>약향</b>이 매력적인 <b>프리미엄 보이차</b>입니다. 소분으로 시음해보세요.',
  },

  // 다구 > 종류별
  {
    id: 40,
    name: '다완',
    slug: 'teacup',
    parentId: 3,
    sortOrder: 1,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
    description:
      '<b>차를 마시는 찻잔(茶碗)</b>. 자사·청자·백자 등 다양한 소재의 다완으로 찻자리의 품격을 높여보세요. <b>경덕진 청화</b>, <b>천목유</b>, <b>여요 빙렬유</b> 등 명랑을 엄선했습니다.',
  },
  {
    id: 41,
    name: '다반',
    slug: 'tea-tray',
    parentId: 3,
    sortOrder: 2,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    description:
      '<b>자사호와 다완을 올려놓는 다반(茶盤)</b>. 대나무·석재·도자기 소재로 찻자리의 기초를 완성합니다. <b>물받이 내장</b> 다반으로 행다(行茶)도 깔끔하게.',
  },
  {
    id: 42,
    name: '다도구 세트',
    slug: 'tea-set',
    parentId: 3,
    sortOrder: 3,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png',
    description:
      '<b>차 도구 일체를 갖춘 다도구 세트</b>. 입문자부터 숙련자까지, 찻자리에 필요한 모든 도구를 한 번에 만나보세요. <b>자사호+다완+다반+차도구</b> 구성으로 즉시 다구를 시작할 수 있습니다.',
  },
  {
    id: 43,
    name: '차 도구',
    slug: 'tea-tools',
    parentId: 3,
    sortOrder: 4,
    isActive: true,
    imageUrl:
      'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    description:
      '차칙·차침·차협 등 개별 차 도구. 하나하나 엄선한 도구로 우리는 과정의 즐거움을 더합니다.',
  },
];

// ============================================================
// 상품 (Product)
// ============================================================
export interface SeedProduct {
  categoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  sku: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  clayType?: string | null;
  teapotShape?: string | null;
}

export const products: SeedProduct[] = [
  // ── 자사호 (주니) ──
  {
    categoryId: 10,
    name: '옥화당 주니 서시호 120ml',
    slug: 'zhuní-xishi-120',
    description:
      '복건성 주니(朱泥) 원료로 제작한 서시형 자사호입니다. 주니 특유의 선홍빛 발색과 높은 수축률이 만들어내는 정교한 라인이 특징입니다. 용량 120ml로 공부차(功夫茶) 독음에 최적화되어 있으며, 우린 횟수가 늘수록 자연스러운 광택이 살아납니다.',
    shortDescription: '복건 주니 · 서시형 · 120ml · 공부차 전용',
    price: 580000,
    salePrice: null,
    stock: 3,
    sku: 'OHD-ZX-001',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    clayType: 'junni',
    teapotShape: 'seoshi',
  },
  {
    categoryId: 10,
    name: '옥화당 주니 주형호 80ml',
    slug: 'zhuní-zhu-80',
    description:
      '작은 공으로 빚은 듯한 주형(珠形) 자사호. 진한 주홍빛 주니 태토가 아름다우며, 반구형 뚜껑과 짧은 직각 주둥이가 조화를 이룹니다. 단차(單泡) 한 잔 분량인 80ml로 일인 다의(茶儀)에 어울립니다.',
    shortDescription: '복건 주니 · 주형 · 80ml · 1인용',
    price: 420000,
    salePrice: 380000,
    stock: 5,
    sku: 'OHD-ZZ-002',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    clayType: 'junni',
    teapotShape: 'juhu',
  },
  {
    categoryId: 10,
    name: '옥화당 주니 석표호 160ml',
    slug: 'zhuní-shipiao-160',
    description:
      '돌표주박 형상을 본 딴 석표형(石瓢形) 주니호. 삼각형 뚜껑 손잡이와 직선적인 흐름이 현대적 감각과 전통미를 동시에 담아냅니다. 160ml 중용량으로 1~2인 차회에 적합합니다.',
    shortDescription: '복건 주니 · 석표형 · 160ml',
    price: 650000,
    salePrice: null,
    stock: 2,
    sku: 'OHD-ZS-003',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    clayType: 'junni',
    teapotShape: 'seokpyo',
  },

  // ── 자사호 (자사) ──
  {
    categoryId: 11,
    name: '옥화당 자사 편평호 200ml',
    slug: 'zǐshā-biānpíng-200',
    description:
      '의흥(宜興) 정통 자사니료 성형한 편평호. 납작한 원판 형태에 부드러운 곡선이 흐르며, 자사 특유의 깊은 자주빛이 우리는 보이차와 완벽하게 어울립니다. 200ml 용량으로 3~4인 소규모 차회에 알맞습니다.',
    shortDescription: '의흥 자사 · 편평형 · 200ml',
    price: 380000,
    salePrice: null,
    stock: 8,
    sku: 'OHD-ZB-004',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    clayType: 'jani',
    teapotShape: 'bianping',
  },
  {
    categoryId: 11,
    name: '옥화당 자사 서시호 150ml',
    slug: 'zǐshā-xishi-150',
    description:
      '부드러운 선과 봉긋한 뚜껑이 여성미를 풍기는 자사 서시호. 깊은 자주빛 자사니가 보이 생차의 꽃향과 잘 어우러집니다. 사용할수록 내부에 차기(茶氣)가 쌓여 맛이 한층 깊어집니다.',
    shortDescription: '의흥 자사 · 서시형 · 150ml',
    price: 450000,
    salePrice: 400000,
    stock: 4,
    sku: 'OHD-ZX-005',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    clayType: 'jani',
    teapotShape: 'seoshi',
  },
  {
    categoryId: 11,
    name: '옥화당 자사 주형호 180ml',
    slug: 'zǐshā-zhu-180',
    description:
      '둥글고 균형잡힌 주형 자사호. 자사니 특유의 투기성(透氣性)이 뛰어나 찻잎 향이 살아나며 열 보존력이 우수합니다. 보이숙차나 무이암차에 특히 잘 맞습니다.',
    shortDescription: '의흥 자사 · 주형 · 180ml',
    price: 320000,
    salePrice: null,
    stock: 10,
    sku: 'OHD-ZZ-006',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    clayType: 'jani',
    teapotShape: 'juhu',
  },

  // ── 자사호 (단니) ──
  {
    categoryId: 12,
    name: '옥화당 단니 석표호 220ml',
    slug: 'duānní-shipiao-220',
    description:
      '밝은 황갈색의 단니(段泥) 태토로 성형한 석표호. 단니 특유의 연황색 발색이 차실(茶室)에 따뜻한 분위기를 더합니다. 녹차·우롱차에도 활용 가능하며, 220ml 대용량으로 3~5인 차회에 적합합니다.',
    shortDescription: '의흥 단니 · 석표형 · 220ml',
    price: 520000,
    salePrice: null,
    stock: 3,
    sku: 'OHD-DS-007',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    clayType: 'danji',
    teapotShape: 'seokpyo',
  },
  {
    categoryId: 12,
    name: '옥화당 단니 편평호 140ml',
    slug: 'duānní-biānpíng-140',
    description:
      '단니의 황갈색과 편평 디자인이 만난 절제미. 넓은 저면과 낮은 높이가 안정적인 실루엣을 만들며, 묵직한 향의 노숙차에 잘 어울립니다.',
    shortDescription: '의흥 단니 · 편평형 · 140ml',
    price: 480000,
    salePrice: 430000,
    stock: 2,
    sku: 'OHD-DB-008',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    clayType: 'danji',
    teapotShape: 'bianping',
  },

  // ── 자사호 (흑니) ──
  {
    categoryId: 13,
    name: '옥화당 흑니 주형호 100ml',
    slug: 'hēiní-zhu-100',
    description:
      '깊고 무게감 있는 흑니(黑泥) 주형호. 완전히 소성된 흑색 표면은 세월이 지날수록 윤기가 더해집니다. 보이 숙차나 진한 무이암차를 우릴 때 찻물의 잡미를 잡아주는 효과가 있습니다.',
    shortDescription: '흑니 · 주형 · 100ml',
    price: 350000,
    salePrice: null,
    stock: 6,
    sku: 'OHD-HZ-009',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
    clayType: 'heugni',
    teapotShape: 'juhu',
  },

  // ── 자사호 (청회니) ──
  {
    categoryId: 14,
    name: '옥화당 청회니 서시호 130ml',
    slug: 'qīnghuīní-xishi-130',
    description:
      '청회빛 차가운 색조를 띠는 청회니(靑灰泥) 서시호. 섬세한 질감의 태토가 손에 닿는 촉감이 좋으며, 향이 섬세한 백차·녹차·황차에 특히 잘 어울립니다.',
    shortDescription: '청회니 · 서시형 · 130ml',
    price: 420000,
    salePrice: null,
    stock: 4,
    sku: 'OHD-QX-010',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
    clayType: 'cheongsu',
    teapotShape: 'seoshi',
  },

  // ── 보이차 ──
  {
    categoryId: 30,
    name: '2019년 반장 고수 생병 357g',
    slug: 'banjang-gushu-2019-sheng',
    description:
      '운남성 맹해현 반장(班章) 고수차(古樹茶) 원료로 압제한 생병(生餅). 강렬한 쓴맛 뒤에 오는 깊은 회감(回甘)이 특징이며, 장기 보관 시 뛰어난 전화(轉化)를 기대할 수 있습니다. 357g 표준 병차.',
    shortDescription: '반장 고수 · 생병 357g · 2019년 · 강렬한 회감',
    price: 180000,
    salePrice: null,
    stock: 20,
    sku: 'OHD-PT-011',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
  {
    categoryId: 30,
    name: '2021년 빙도 고수 생병 357g',
    slug: 'bingdao-gushu-2021-sheng',
    description:
      '운남 임창 빙도(冰島) 고수원료 생병. 빙도 특유의 달콤한 화밀향과 부드러운 쓴맛, 긴 여운의 감미(甘味)로 최고급 생차 중 하나로 꼽힙니다.',
    shortDescription: '빙도 고수 · 생병 357g · 2021년 · 화밀향',
    price: 320000,
    salePrice: null,
    stock: 10,
    sku: 'OHD-PT-012',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
  {
    categoryId: 31,
    name: '2015년 대익 7572 숙병 357g',
    slug: 'dayi-7572-2015-shou',
    description:
      '보이숙차의 기준이 되는 대익(大益) 7572 배방. 2015년 압제본으로 부드럽게 발효된 홍탕(紅湯)과 진한 대추·목이버섯향이 특징입니다. 입문용 숙차로 추천.',
    shortDescription: '대익 7572 · 숙병 357g · 2015년 · 입문 추천',
    price: 85000,
    salePrice: 75000,
    stock: 30,
    sku: 'OHD-PS-013',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
  },
  {
    categoryId: 31,
    name: '2010년 하관 FT 숙타 250g',
    slug: 'xiaguan-ft-2010-shou-tuo',
    description:
      '하관차창(下關茶廠) FT 배방 숙타차(熟沱茶). 단단히 압제된 버섯 모양의 타차 형태로, 10년 이상 숙성되어 부드럽고 진한 탕색이 돋보입니다.',
    shortDescription: '하관 FT · 숙타 250g · 2010년 · 10년 숙성',
    price: 65000,
    salePrice: null,
    stock: 15,
    sku: 'OHD-PS-014',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
  },
  {
    categoryId: 32,
    name: '1990년대 홍인 노숙병 (소분) 10g',
    slug: 'hong-yin-1990s-aged-10g',
    description:
      '1990년대 제작 추정 홍인(紅印) 계열 노차 소분. 수십 년 자연 숙성된 약향(藥香)과 함목향(樟木香)이 깊게 배어 있습니다. 시음 목적 소분 상품이며 재고가 한정적입니다.',
    shortDescription: '홍인 계열 노차 · 10g 소분 · 1990년대',
    price: 120000,
    salePrice: null,
    stock: 8,
    sku: 'OHD-PA-015',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },

  // ── 다구 ──
  {
    categoryId: 40,
    name: '경덕진 청화 다완 6P 세트',
    slug: 'jingdezhen-blue-white-teacup-6p',
    description:
      '경덕진(景德鎭) 전통 청화자기 다완 6개 세트. 코발트블루 수묵화 문양이 섬세하게 그려져 있으며, 얇은 태토와 투명 유약으로 찻물 색을 감상하기에 좋습니다.',
    shortDescription: '경덕진 청화 · 다완 6P · 80ml',
    price: 120000,
    salePrice: 105000,
    stock: 12,
    sku: 'OHD-TW-016',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
  {
    categoryId: 40,
    name: '건수요 천목유 다완 단품',
    slug: 'jian-ware-tenmoku-teacup',
    description:
      '송대(宋代) 건요(建窯) 천목유(天目釉) 재현 다완. 산화철 유약이 고온에서 만들어내는 은빛 토끼 털 문양(兎毫紋)이 아름답습니다. 말차(抹茶) 및 탕차(湯茶)에 최적화된 넓은 입구 형태.',
    shortDescription: '건수요 천목유 · 토호문 · 말차용',
    price: 58000,
    salePrice: null,
    stock: 20,
    sku: 'OHD-TW-017',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
  },
  {
    categoryId: 41,
    name: '대나무 다반 40×25cm',
    slug: 'bamboo-tea-tray-40x25',
    description:
      '천연 대나무를 슬라이스 가공한 다반(茶盤). 물받이 서랍이 내장되어 있어 행다(行茶) 중 흘린 물을 깔끔하게 처리할 수 있습니다. 40×25cm 중형으로 자사호 + 다완 4개 배치 가능.',
    shortDescription: '천연 대나무 · 40×25cm · 물받이 내장',
    price: 89000,
    salePrice: null,
    stock: 15,
    sku: 'OHD-TR-018',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
  {
    categoryId: 42,
    name: '옥화당 입문 다도구 세트',
    slug: 'okhwadang-starter-tea-set',
    description:
      '자사호 입문자를 위한 올인원 다도구 세트. 자사 주형호 180ml, 청화 다완 2P, 대나무 다반, 차헌·차칙·차협·차루 4종 차도구(茶道具), 차통(茶筒)이 포함된 구성입니다.',
    shortDescription: '자사호+다완+다반+차도구 세트 · 입문 구성',
    price: 280000,
    salePrice: 240000,
    stock: 7,
    sku: 'OHD-TS-019',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
  {
    categoryId: 43,
    name: '대나무 차도구 5종 세트',
    slug: 'bamboo-tea-tools-5p',
    description:
      '차헌(茶獻)·차칙(茶則)·차협(茶夾)·차루(茶漏)·차침(茶針) 5종으로 구성된 대나무 차도구 세트. 천연 대나무 특유의 은은한 향이 나며 차도구 통(筒)이 함께 제공됩니다.',
    shortDescription: '대나무 차도구 5종 · 차헌/차칙/차협/차루/차침',
    price: 35000,
    salePrice: null,
    stock: 25,
    sku: 'OHD-TT-020',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
  },
  {
    categoryId: 43,
    name: '유리 공도배 (公道杯) 200ml',
    slug: 'glass-fairness-cup-200ml',
    description:
      '투명 내열유리 공도배. 우린 찻물을 고르게 나눠주는 필수 다구로, 맑은 탕색 감상에 최적입니다. 200ml 용량에 세밀한 눈금 인쇄가 특징입니다.',
    shortDescription: '내열유리 공도배 · 200ml · 탕색 감상',
    price: 22000,
    salePrice: null,
    stock: 40,
    sku: 'OHD-TT-021',
    status: ProductStatus.ACTIVE,
    isFeatured: false,
  },
  {
    categoryId: 40,
    name: '여요 빙렬유 다완 단품',
    slug: 'ru-ware-crackle-teacup',
    description:
      '북송(北宋) 여요(汝窯) 빙렬유(氷裂釉) 재현 다완. 천청색(天靑色) 유약 표면에 자연스럽게 형성된 빙렬(氷裂) 문양이 고아한 아름다움을 자아냅니다. 백차·녹차·청차에 어울립니다.',
    shortDescription: '여요 빙렬유 · 천청색 · 100ml',
    price: 75000,
    salePrice: null,
    stock: 10,
    sku: 'OHD-TW-022',
    status: ProductStatus.ACTIVE,
    isFeatured: true,
  },
];

// ============================================================
// 상품 이미지 (ProductImage)
// ============================================================
export interface SeedProductImage {
  productId: number;
  url: string;
  alt: string;
  sortOrder: number;
  isThumbnail: boolean;
}

export const productImages: SeedProductImage[] = [
  // 제품 1: 주니 서시호 120ml (4 images)
  {
    productId: 1,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '옥화당 주니 서시호 정면',
    sortOrder: 0,
    isThumbnail: true,
  },
  {
    productId: 1,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '주니 서시호 측면',
    sortOrder: 1,
    isThumbnail: false,
  },
  {
    productId: 1,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '주니 서시호 뚜껑 상세',
    sortOrder: 2,
    isThumbnail: false,
  },
  {
    productId: 1,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    alt: '주니 서시호 차와 함께',
    sortOrder: 3,
    isThumbnail: false,
  },
  // 제품 2: 주니 주형호 80ml (4 images)
  {
    productId: 2,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '주니 주형호 정면',
    sortOrder: 0,
    isThumbnail: true,
  },
  {
    productId: 2,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '주니 주형호 측면',
    sortOrder: 1,
    isThumbnail: false,
  },
  {
    productId: 2,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    alt: '주니 주형호 주둥이 상세',
    sortOrder: 2,
    isThumbnail: false,
  },
  {
    productId: 2,
    url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    alt: '주니 주형호 사용 예시',
    sortOrder: 3,
    isThumbnail: false,
  },
];

// ============================================================
// 상품 상세 이미지 (ProductDetailImage)
// ============================================================
export interface SeedProductDetailImage {
  productId: number;
  url: string;
  alt: string;
  sortOrder: number;
  isActive: boolean;
}

export const productDetailImages: SeedProductDetailImage[] = [
  { productId: 1, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '주니 서시호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 2, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '주니 주형호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 3, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '주니 석표호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 4, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '자사 편평호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 5, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '자사 서시호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 6, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '자사 주형호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 7, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '단니 석표호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 8, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '단니 편평호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 9, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '흑니 주형호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 10, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png', alt: '청회니 서시호 상세 설명 이미지', sortOrder: 0, isActive: true },
  { productId: 11, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', alt: '반장 고수 생병 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 11, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '반장 고수 생병 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 12, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', alt: '빙도 고수 생병 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 12, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '빙도 고수 생병 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 13, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', alt: '대익 7572 숙병 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 13, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '대익 7572 숙병 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 14, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', alt: '하관 숙타 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 14, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '하관 숙타 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 15, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png', alt: '홍인 노차 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 15, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '홍인 노차 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 16, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '경덕진 청화 다완 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 16, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '경덕진 청화 다완 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 17, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '건수요 천목유 다완 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 17, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '건수요 천목유 다완 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 18, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '대나무 다반 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 18, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '대나무 다반 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 19, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '입문 세트 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 19, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '입문 세트 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 19, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '입문 세트 상세정보 3', sortOrder: 2, isActive: true },
  { productId: 20, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '대나무 차도구 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 20, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '대나무 차도구 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 21, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '유리 공도배 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 21, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '유리 공도배 상세정보 2', sortOrder: 1, isActive: true },
  { productId: 22, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '여요 빙렬유 다완 상세정보 1', sortOrder: 0, isActive: true },
  { productId: 22, url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-3.png', alt: '여요 빙렬유 다완 상세정보 2', sortOrder: 1, isActive: true },
];

// ============================================================
// 상품 옵션 (ProductOption)
// ============================================================
export interface SeedProductOption {
  productId: number;
  name: string;
  value: string;
  priceAdjustment: number;
  stock: number;
  sortOrder: number;
}

export const productOptions: SeedProductOption[] = [
  // 제품 1: 선물포장 옵션
  { productId: 1, name: '포장', value: '일반 포장', priceAdjustment: 0, stock: 3, sortOrder: 0 },
  { productId: 1, name: '포장', value: '전통 목함 선물포장', priceAdjustment: 30000, stock: 2, sortOrder: 1 },
  // 제품 4: 용량 선택
  { productId: 4, name: '포장', value: '일반 포장', priceAdjustment: 0, stock: 5, sortOrder: 0 },
  { productId: 4, name: '포장', value: '전통 목함 선물포장', priceAdjustment: 30000, stock: 3, sortOrder: 1 },
  // 보이차 생병: 보관함 옵션
  { productId: 11, name: '보관', value: '기본 포장', priceAdjustment: 0, stock: 15, sortOrder: 0 },
  { productId: 11, name: '보관', value: '전통 죽지 보관함 포함', priceAdjustment: 15000, stock: 5, sortOrder: 1 },
  { productId: 12, name: '보관', value: '기본 포장', priceAdjustment: 0, stock: 8, sortOrder: 0 },
  { productId: 12, name: '보관', value: '전통 죽지 보관함 포함', priceAdjustment: 15000, stock: 2, sortOrder: 1 },
  // 입문 세트: 자사호 니료 선택
  { productId: 19, name: '자사호 니료', value: '자사 (기본)', priceAdjustment: 0, stock: 4, sortOrder: 0 },
  { productId: 19, name: '자사호 니료', value: '단니 (+20,000)', priceAdjustment: 20000, stock: 2, sortOrder: 1 },
  { productId: 19, name: '자사호 니료', value: '주니 (+50,000)', priceAdjustment: 50000, stock: 1, sortOrder: 2 },
];

// ============================================================
// 네비게이션 (NavigationItem)
// ============================================================
export interface SeedNavigationItem {
  id: number;
  group: 'gnb' | 'sidebar' | 'footer';
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  parent_id: number | null;
}

export const navigationItems: SeedNavigationItem[] = [
  // GNB
  { id: 100, group: 'gnb', label: '홈', url: '/', sort_order: 0, is_active: true, parent_id: null },
  { id: 101, group: 'gnb', label: '자사호', url: '/products?categoryId=1', sort_order: 1, is_active: true, parent_id: null },
  { id: 102, group: 'gnb', label: '보이차·다구', url: '/products?categoryId=2', sort_order: 2, is_active: true, parent_id: null },
  { id: 104, group: 'gnb', label: '베스트', url: '/products?sort=popular', sort_order: 3, is_active: true, parent_id: null },
  { id: 108, group: 'gnb', label: '브랜드 소개', url: '/p/about', sort_order: 4, is_active: true, parent_id: null },
  { id: 109, group: 'gnb', label: '기획전', url: '/p/exhibition', sort_order: 5, is_active: true, parent_id: null },

  // GNB 하위메뉴: 브랜드 소개
  { id: 105, group: 'gnb', label: '└ 저널', url: '/journal', sort_order: 1, is_active: true, parent_id: 108 },
  { id: 106, group: 'gnb', label: '└ 컬렉션', url: '/collection', sort_order: 2, is_active: true, parent_id: 108 },
  { id: 107, group: 'gnb', label: '└ 아카이브', url: '/archive', sort_order: 3, is_active: true, parent_id: 108 },

  // GNB 하위메뉴: 자사호
  { id: 150, group: 'gnb', label: '└ 니료별', url: '/products?categoryId=1', sort_order: 1, is_active: true, parent_id: 101 },
  { id: 151, group: 'gnb', label: '└ 주니', url: '/products?categoryId=10', sort_order: 1, is_active: true, parent_id: 150 },
  { id: 152, group: 'gnb', label: '└ 자사', url: '/products?categoryId=11', sort_order: 2, is_active: true, parent_id: 150 },
  { id: 153, group: 'gnb', label: '└ 단니', url: '/products?categoryId=12', sort_order: 3, is_active: true, parent_id: 150 },
  { id: 154, group: 'gnb', label: '└ 흑니', url: '/products?categoryId=13', sort_order: 4, is_active: true, parent_id: 150 },
  { id: 155, group: 'gnb', label: '└ 청회니', url: '/products?categoryId=14', sort_order: 5, is_active: true, parent_id: 150 },
  { id: 156, group: 'gnb', label: '└ 모양별', url: '/products?categoryId=1', sort_order: 6, is_active: true, parent_id: 101 },
  { id: 157, group: 'gnb', label: '└ 주형', url: '/products?categoryId=20', sort_order: 1, is_active: true, parent_id: 156 },
  { id: 158, group: 'gnb', label: '└ 석표', url: '/products?categoryId=21', sort_order: 2, is_active: true, parent_id: 156 },
  { id: 159, group: 'gnb', label: '└ 서시', url: '/products?categoryId=22', sort_order: 3, is_active: true, parent_id: 156 },
  { id: 160, group: 'gnb', label: '└ 편평', url: '/products?categoryId=23', sort_order: 4, is_active: true, parent_id: 156 },

  // GNB 하위메뉴: 보이차·다구 > 보이차
  { id: 161, group: 'gnb', label: '└ 보이차', url: '/products?categoryId=2', sort_order: 1, is_active: true, parent_id: 102 },
  { id: 162, group: 'gnb', label: '└ 생차', url: '/products?categoryId=30', sort_order: 1, is_active: true, parent_id: 161 },
  { id: 163, group: 'gnb', label: '└ 숙차', url: '/products?categoryId=31', sort_order: 2, is_active: true, parent_id: 161 },
  { id: 164, group: 'gnb', label: '└ 노차', url: '/products?categoryId=32', sort_order: 3, is_active: true, parent_id: 161 },

  // GNB 하위메뉴: 보이차·다구 > 다구
  { id: 165, group: 'gnb', label: '└ 다구', url: '/products?categoryId=3', sort_order: 2, is_active: true, parent_id: 102 },
  { id: 166, group: 'gnb', label: '└ 다완', url: '/products?categoryId=40', sort_order: 1, is_active: true, parent_id: 165 },
  { id: 167, group: 'gnb', label: '└ 다반', url: '/products?categoryId=41', sort_order: 2, is_active: true, parent_id: 165 },
  { id: 168, group: 'gnb', label: '└ 다도구 세트', url: '/products?categoryId=42', sort_order: 3, is_active: true, parent_id: 165 },
  { id: 169, group: 'gnb', label: '└ 차 도구', url: '/products?categoryId=43', sort_order: 4, is_active: true, parent_id: 165 },

  // Sidebar
  { id: 10, group: 'sidebar', label: '전체 상품', url: '/products', sort_order: 0, is_active: true, parent_id: null },
  { id: 11, group: 'sidebar', label: '자사호', url: '/products?categoryId=1', sort_order: 1, is_active: true, parent_id: null },
  { id: 12, group: 'sidebar', label: '└ 주니', url: '/products?categoryId=10', sort_order: 2, is_active: true, parent_id: 11 },
  { id: 13, group: 'sidebar', label: '└ 자사', url: '/products?categoryId=11', sort_order: 3, is_active: true, parent_id: 11 },
  { id: 14, group: 'sidebar', label: '└ 단니', url: '/products?categoryId=12', sort_order: 4, is_active: true, parent_id: 11 },
  { id: 15, group: 'sidebar', label: '보이차', url: '/products?categoryId=2', sort_order: 5, is_active: true, parent_id: null },
  { id: 16, group: 'sidebar', label: '└ 생차', url: '/products?categoryId=30', sort_order: 6, is_active: true, parent_id: 15 },
  { id: 17, group: 'sidebar', label: '└ 숙차', url: '/products?categoryId=31', sort_order: 7, is_active: true, parent_id: 15 },
  { id: 18, group: 'sidebar', label: '다구', url: '/products?categoryId=3', sort_order: 8, is_active: true, parent_id: null },
  { id: 50, group: 'sidebar', label: '브랜드 소개', url: '/p/about', sort_order: 9, is_active: true, parent_id: null },
  { id: 51, group: 'sidebar', label: '└ 저널', url: '/journal', sort_order: 1, is_active: true, parent_id: 50 },
  { id: 52, group: 'sidebar', label: '└ 컬렉션', url: '/collection', sort_order: 2, is_active: true, parent_id: 50 },
  { id: 53, group: 'sidebar', label: '└ 아카이브', url: '/archive', sort_order: 3, is_active: true, parent_id: 50 },
  { id: 19, group: 'sidebar', label: '기획전', url: '/p/exhibition', sort_order: 10, is_active: true, parent_id: null },

  // Footer
  { id: 20, group: 'footer', label: '고객센터', url: '/pages/support', sort_order: 0, is_active: true, parent_id: null },
  { id: 21, group: 'footer', label: '자주 묻는 질문', url: '/faq', sort_order: 1, is_active: true, parent_id: null },
  { id: 22, group: 'footer', label: '배송 안내', url: '/pages/shipping', sort_order: 2, is_active: true, parent_id: null },
  { id: 23, group: 'footer', label: '반품 및 교환', url: '/pages/returns', sort_order: 3, is_active: true, parent_id: null },
  { id: 24, group: 'footer', label: '이용약관', url: '/pages/terms', sort_order: 4, is_active: true, parent_id: null },
  { id: 25, group: 'footer', label: '개인정보처리방침', url: '/pages/privacy', sort_order: 5, is_active: true, parent_id: null },
  { id: 26, group: 'footer', label: '전체 상품', url: '/products', sort_order: 6, is_active: true, parent_id: null },
  { id: 27, group: 'footer', label: '컬렉션', url: '/collection', sort_order: 7, is_active: true, parent_id: null },
  { id: 28, group: 'footer', label: 'Archive', url: '/archive', sort_order: 8, is_active: true, parent_id: null },
  { id: 29, group: 'footer', label: '저널', url: '/journal', sort_order: 9, is_active: true, parent_id: null },
];

// ============================================================
// 배너 (Banner)
// ============================================================
export interface SeedBanner {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export const banners: SeedBanner[] = [
  {
    title: '봄 기획전 — <b>주니 신작</b> 입고',
    imageUrl: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
    linkUrl: '/p/spring-2026',
    sortOrder: 0,
    isActive: true,
    startsAt: new Date('2026-03-01'),
    endsAt: new Date('2026-04-30'),
  },
  {
    title: '<b>반장 고수</b> 생병 2019년 한정 입고',
    imageUrl: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    linkUrl: '/products/banjang-gushu-2019-sheng',
    sortOrder: 1,
    isActive: true,
    startsAt: new Date('2026-03-15'),
    endsAt: new Date('2026-05-15'),
  },
  {
    title: '입문 다도구 세트 — <b>14% 특가</b> 240,000원',
    imageUrl: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
    linkUrl: '/products/okhwadang-starter-tea-set',
    sortOrder: 2,
    isActive: true,
    startsAt: null,
    endsAt: null,
  },
];

// ============================================================
// 프로모션 (Promotion)
// ============================================================
type PromotionType = 'timesale' | 'exhibition' | 'event';

export interface SeedPromotion {
  title: string;
  description: string;
  type: PromotionType;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  discount_rate: number | null;
  image_url: string | null;
}

export const promotions: SeedPromotion[] = [
  {
    title: '봄 기획전 — 주니 신작',
    description: '<b>복건 주니(朱泥)</b> 신작 자사호 선착순 특가. <b>주니 서시호·주형호·석표호</b> 한정 수량 입고. 재고 소진 시 조기 마감될 수 있습니다.',
    type: 'exhibition',
    starts_at: new Date('2026-03-29'),
    ends_at: new Date('2026-04-30'),
    is_active: true,
    discount_rate: null,
    image_url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-1.png',
  },
  {
    title: '입문 세트 14% 타임세일',
    description: '<b>옥화당 입문 다도구 세트</b> 한정 수량 특가. <b>280,000원 → 240,000원</b> (40,000원 할인). 자사호+다완+다반+차도구 완전 구성.',
    type: 'timesale',
    starts_at: new Date('2026-03-29T09:00:00'),
    ends_at: new Date('2026-04-05T23:59:59'),
    is_active: true,
    discount_rate: 14,
    image_url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
  },
  {
    title: '보이차 입문 이벤트',
    description: '<b>대익 7572 숙병</b> 구매 시 <b>대나무 차도구 5종 세트</b> 증정. 차도구(차칙·차침·차협·차루·차침)가 모두 포함된 입문 필수 세트.',
    type: 'event',
    starts_at: new Date('2026-04-01'),
    ends_at: new Date('2026-04-30'),
    is_active: true,
    discount_rate: null,
    image_url: 'https://okhwadang-images-978581199241-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/teapot-2.png',
  },
];

// ============================================================
// 공지사항 (Notice)
// ============================================================
export interface SeedNotice {
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
}

export const notices: SeedNotice[] = [
  {
    title: '옥화당 오픈 안내',
    content: '안녕하세요. 자사호·보이차·다구 전문 D2C 쇼핑몰 옥화당(玉花堂)이 정식 오픈하였습니다.\n앞으로 좋은 자사호와 보이차를 직접 소개해 드리겠습니다.',
    isPinned: true,
    isPublished: true,
  },
  {
    title: '[배송 안내] 일반 배송 및 선물 포장 안내',
    content: '주문 후 1~2 영업일 내 출고됩니다.\n전통 목함 선물포장 옵션 선택 시 추가 1 영업일이 소요될 수 있습니다.\n자사호 특성상 파손 방지를 위해 이중 포장 처리됩니다.',
    isPinned: false,
    isPublished: true,
  },
  {
    title: '[이용 안내] 자사호 교환·반품 정책',
    content: '자사호는 수공예 특성상 미세한 색감 차이 및 유약 표현이 있을 수 있습니다.\n이는 불량이 아니며 교환 사유가 되지 않습니다.\n파손 및 제품 불량의 경우 수령 후 3일 이내 고객센터로 문의 주세요.',
    isPinned: true,
    isPublished: true,
  },
];

// ============================================================
// FAQ
// ============================================================
export interface SeedFaq {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export const faqs: SeedFaq[] = [
  {
    question: '자사호를 처음 구매했는데 어떻게 개호(開壺)하나요?',
    answer: '자사호를 처음 사용하기 전에는 개호(開壺) 과정이 필요합니다.\n1. 자사호를 끓는 물에 10~15분간 끓여 잡냄새를 제거합니다.\n2. 우릴 예정인 찻잎을 넣고 다시 5분간 끓입니다.\n3. 식힌 후 깨끗이 헹궈 사용합니다.',
    category: '상품',
    sortOrder: 1,
    isPublished: true,
  },
  {
    question: '자사호에 담당차(擔當茶)를 정해야 하나요?',
    answer: '자사호는 기공성(氣孔性)이 있어 찻물이 미세하게 흡수됩니다. 한 종류의 차를 꾸준히 우리면 차기(茶氣)가 쌓여 맛이 깊어집니다. 보이차용, 우롱차용으로 구분해 사용하시는 것을 권장드립니다.',
    category: '상품',
    sortOrder: 2,
    isPublished: true,
  },
  {
    question: '보이차 생차와 숙차의 차이는 무엇인가요?',
    answer: '생차(生茶)는 자연 발효 방식으로 시간이 지날수록 맛이 변화합니다. 초기에는 쓴맛·떫은맛이 있으며 장기 보관 가치가 있습니다.\n숙차(熟茶)는 인공 발효(악퇴 발효)를 거쳐 부드럽고 달콤한 맛을 지닙니다. 바로 음용하기 좋습니다.',
    category: '상품',
    sortOrder: 3,
    isPublished: true,
  },
  {
    question: '배송은 얼마나 걸리나요?',
    answer: '주문 확인 후 1~2 영업일 내 출고되며, 이후 택배 기준 1~3일 내 수령 가능합니다. 자사호 선물포장 옵션 선택 시 +1 영업일이 소요됩니다.',
    category: '배송',
    sortOrder: 1,
    isPublished: true,
  },
  {
    question: '교환·반품 기간은 어떻게 되나요?',
    answer: '단순 변심의 경우 수령 후 7일 이내에 교환·반품 가능합니다. 자사호는 수공예 특성상 미세한 색감 차이는 불량이 아님을 양해 부탁드립니다. 파손·불량의 경우 수령 후 3일 이내 고객센터로 연락 주세요.',
    category: '교환/반품',
    sortOrder: 1,
    isPublished: true,
  },
];

// ============================================================
// 테스트 사용자 (User)
// ============================================================
type UserRole = 'user' | 'admin' | 'super_admin';

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
}

export const users: SeedUser[] = [
  {
    email: 'reviewer1@okhwadang.com',
    password: '$2b$10$wJAaOWFn9rdHbx3K5AEzu.mpoUHtqMxPWzE9WSWSm15Vj85WdCL7S',
    name: '김차림',
    phone: null,
    role: 'user',
    is_active: true,
  },
  {
    email: 'reviewer2@okhwadang.com',
    password: '$2b$10$oe0RiBM7H3BAATi0ip1eGO1NT0wCqeKG3SBowfVaLUDytUC4i9dRq',
    name: '이보이',
    phone: null,
    role: 'user',
    is_active: true,
  },
  {
    email: 'reviewer3@okhwadang.com',
    password: '$2b$10$yICUqkVMdV.yu9IUVU7F7uc754wywBlXAGCgRC/ao3LQ7mOHM6uyS',
    name: '박다구',
    phone: null,
    role: 'user',
    is_active: true,
  },
  {
    email: 'reviewer4@okhwadang.com',
    password: '$2b$10$4l/Mqok3lGJuc2/uWUiZS.5TXBGlysr0vzjJ2bmsVCGO3p7C/Xel.',
    name: '정자호',
    phone: null,
    role: 'user',
    is_active: true,
  },
  {
    email: 'admin@okhwadang.com',
    password: '$2b$10$l46hZJmq5F8DoKvHZrQ0geSQgIxVXjaDPn2oCv7fv5L2AHtMQPSlW',
    name: '관리자',
    phone: null,
    role: 'admin',
    is_active: true,
  },
];

// ============================================================
// 주문 (Order)
// ============================================================
type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface SeedOrder {
  userId: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string | null;
  pointsUsed: number;
  createdAt: Date;
}

export const orders: SeedOrder[] = [
  { userId: 1, orderNumber: 'ORD-20260301-001', status: 'delivered', totalAmount: 580000, discountAmount: 0, shippingFee: 0, recipientName: '김차림', recipientPhone: '010-1234-1001', zipcode: '06000', address: '서울특별시 강남구 테헤란로 1', addressDetail: '101동 1001호', memo: null, pointsUsed: 0, createdAt: new Date('2026-03-01T10:00:00') },
  { userId: 2, orderNumber: 'ORD-20260302-001', status: 'delivered', totalAmount: 760000, discountAmount: 0, shippingFee: 0, recipientName: '이보이', recipientPhone: '010-1234-1002', zipcode: '06000', address: '서울특별시 강남구 테헤란로 2', addressDetail: '202동 2002호', memo: null, pointsUsed: 0, createdAt: new Date('2026-03-02T11:00:00') },
  { userId: 3, orderNumber: 'ORD-20260303-001', status: 'delivered', totalAmount: 650000, discountAmount: 0, shippingFee: 0, recipientName: '박다구', recipientPhone: '010-1234-1003', zipcode: '06000', address: '서울특별시 서초구 방배로 3', addressDetail: '303동 3003호', memo: null, pointsUsed: 0, createdAt: new Date('2026-03-03T09:00:00') },
  { userId: 4, orderNumber: 'ORD-20260304-001', status: 'delivered', totalAmount: 380000, discountAmount: 0, shippingFee: 0, recipientName: '정자호', recipientPhone: '010-1234-1004', zipcode: '06000', address: '서울특별시 마포구 합정로 4', addressDetail: '404동 4004호', memo: null, pointsUsed: 0, createdAt: new Date('2026-03-04T14:00:00') },
  { userId: 1, orderNumber: 'ORD-20260305-001', status: 'delivered', totalAmount: 450000, discountAmount: 50000, shippingFee: 0, recipientName: '김차림', recipientPhone: '010-1234-1001', zipcode: '06000', address: '서울특별시 강남구 테헤란로 1', addressDetail: '101동 1001호', memo: null, pointsUsed: 0, createdAt: new Date('2026-03-05T10:00:00') },
];

// ============================================================
// 주문항목 (OrderItem)
// ============================================================
export interface SeedOrderItem {
  orderId: number;
  productId: number;
  productOptionId: number | null;
  productName: string;
  optionName: string | null;
  price: number;
  quantity: number;
}

export const orderItems: SeedOrderItem[] = [
  { orderId: 1, productId: 1, productOptionId: null, productName: '옥화당 주니 서시호 120ml', optionName: null, price: 580000, quantity: 1 },
  { orderId: 2, productId: 2, productOptionId: null, productName: '옥화당 주니 주형호 80ml', optionName: null, price: 380000, quantity: 2 },
  { orderId: 3, productId: 3, productOptionId: null, productName: '옥화당 주니 석표호 160ml', optionName: null, price: 650000, quantity: 1 },
  { orderId: 4, productId: 4, productOptionId: null, productName: '옥화당 자사 편평호 200ml', optionName: null, price: 380000, quantity: 1 },
  { orderId: 5, productId: 5, productOptionId: null, productName: '옥화당 자사 서시호 150ml', optionName: null, price: 400000, quantity: 1 },
];

// ============================================================
// 리뷰 (Review)
// ============================================================
export interface SeedReview {
  userId: number;
  productId: number;
  orderItemId: number;
  rating: number;
  content: string;
  imageUrls: string[] | null;
  isVisible: boolean;
  createdAt: Date;
}

export const reviews: SeedReview[] = [
  // 제품 1: 주니 서시호 120ml (3 reviews)
  { userId: 1, productId: 1, orderItemId: 1, rating: 5, content: '처음 자사호를 구매해보는데 정말 만족스럽습니다. 복건 주니 특유의 선홍빛이 차를 따를 때마다 아름답습니다. 120ml 용량이 딱 좋아서 공부차 한 잔씩 마시기 완벽해요. 오히려 크기가 작아서 더 소중히 여겨지네요.', imageUrls: null, isVisible: true, createdAt: new Date('2026-03-05T15:00:00') },
  { userId: 2, productId: 1, orderItemId: 16, rating: 5, content: '선물로 구매했어요. 포장도 꼼꼼하고壶 сами도 정말 예쁩니다. 받은 분이很喜欢하셨어요. 다음엔 자신용으로 하나 더 살까 생각중입니다.', imageUrls: null, isVisible: true, createdAt: new Date('2026-03-06T10:00:00') },
  { userId: 3, productId: 1, orderItemId: 26, rating: 4, content: '完成度高得很。壶身线条流畅，壶嘴出水顺畅，断水干净。唯一的小遗憾是壶盖稍微紧了一些，需要适应一段时间。整体来说非常满意，会推荐给朋友。', imageUrls: null, isVisible: true, createdAt: new Date('2026-03-07T14:00:00') },
];

// ============================================================
// 컬렉션 (Collection)
// ============================================================
export interface SeedCollection {
  type: string;
  name: string;
  nameKo: string;
  color: string | null;
  description: string | null;
  productUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const collections: SeedCollection[] = [
  // 니료별
  { type: 'clay', name: 'junni', nameKo: '주니', color: '#8B4513', description: '주철질의 대표 니료로, 적색 내지 황갈색을 띱니다. 내열성과 보온성이 뛰어나며, 차의 풍미를 극대화합니다.', productUrl: '/products?clayType=junni', sortOrder: 1, isActive: true },
  { type: 'clay', name: 'danji', nameKo: '단니', color: '#D4A574', description: '황토계열의 단단한 니료로, 밝은 황금빛을 띱니다. 은은한 향과 부드러운 맛을 표현하는 데 적합합니다.', productUrl: '/products?clayType=danji', sortOrder: 2, isActive: true },
  { type: 'clay', name: 'jani', nameKo: '자니', color: '#2F4F4F', description: '청자질의 대표 니료로, 청록색 내지 암청색을 띱니다. 깊은 향과 시원한 맛을 자랑합니다.', productUrl: '/products?clayType=jani', sortOrder: 3, isActive: true },
  { type: 'clay', name: 'heugni', nameKo: '흑니', color: '#1C1C1C', description: '흑색 도자기 전용 니료로, 검은색을 띱니다. 떫은맛을 줄이고 깊은 맛을내는 특성이 있습니다.', productUrl: '/products?clayType=heugni', sortOrder: 4, isActive: true },
  { type: 'clay', name: 'cheongsu', nameKo: '청수니', color: '#4682B4', description: '청수(정선) 지역 특유의 청백색 니료입니다. 산뜻한 맛과 깨끗한 향이 특징입니다.', productUrl: '/products?clayType=cheongsu', sortOrder: 5, isActive: true },
  { type: 'clay', name: 'nokni', nameKo: '녹니', color: '#556B2F', description: '녹토계열의 독특한 니료로, 녹색기를 띱니다. 건강과 풍미를 동시에 생각하는 이들에게 사랑받습니다.', productUrl: '/products?clayType=nokni', sortOrder: 6, isActive: true },
  // 모양별
  { type: 'shape', name: 'seoshi', nameKo: '서시', color: null, description: '평평하고 넓은 형태의 주전자. 뛰어난 안정감과 넓은 탕면으로 차의 풍미를 펼쳐줍니다.', productUrl: '/products?teapotShape=seoshi', sortOrder: 1, isActive: true },
  { type: 'shape', name: 'seokpyo', nameKo: '석표', color: null, description: '곰방대 형태에서 영감을 받은 독특한 모양. 절제된 아름다움과 실용성을 겸비합니다.', productUrl: '/products?teapotShape=seokpyo', sortOrder: 2, isActive: true },
  { type: 'shape', name: 'inwang', nameKo: '인왕', color: null, description: '인왕산의 기품을 담은 날카롭고 세련된 라인. 현대적 감각으로 재해석한 전통 형태입니다.', productUrl: '/products?teapotShape=inwang', sortOrder: 3, isActive: true },
  { type: 'shape', name: 'deokjong', nameKo: '덕종', color: null, description: '고려 시대의 달인으로 유명한 덕종달인의 기법을 현대에 재현. 우아하고 정제된 실루엿입니다.', productUrl: '/products?teapotShape=deokjong', sortOrder: 4, isActive: true },
  { type: 'shape', name: 'supeong', nameKo: '수평', color: null, description: '수평의 아름다운 곡선. 검소하고 담백한 아름다움으로 평온함을 선물합니다.', productUrl: '/products?teapotShape=supeong', sortOrder: 5, isActive: true },
];

// ============================================================
// 저널 (JournalEntry)
// ============================================================
export interface SeedJournalEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  date: string;
  readTime: string;
  summary: string;
  content: string;
  isPublished: boolean;
}

export const journalEntries: SeedJournalEntry[] = [
  {
    slug: 'yixing-clay-origin',
    title: '의흥 자사호의 기원',
    subtitle: '600년 흙의 역사를 따라가다',
    category: 'CULTURE',
    date: '2025-03-15',
    readTime: '8분',
    summary: '명나라 시대부터 이어져 온 의흥 자사호의 역사. 황룡산 자사 광맥의 발견부터 현대 장인들의 계승까지, 600년 흙의 이야기를 기록합니다.',
    content: '["의흥(宜興)은 장쑤성 남부, 태호(太湖) 서안에 자리한 작은 도시입니다. 이곳의 황룡산(黃龍山) 일대에서 채취되는 자사니(紫砂泥)는 세계 어디에서도 찾을 수 없는 고유한 광물 조성을 지닙니다.","명나라 정덕 연간(1506–1521), 금사사(金沙寺)의 한 승려가 자사니료 다관을 빚기 시작했다는 기록이 전해집니다. 이후 공춘(供春)이 이 기법을 체계화하며 자사호 제작의 시조가 되었습니다.","청나라에 이르러 진명원(陳鳴遠),혜맹신(惠孟臣) 등 명장들이 등장하며 자사호는 단순한 다구를 넘어 예술품의 경지에 올랐습니다. 특히혜맹신의 소형 주전자는 조주공부차(潮州工夫茶) 문화와 결합하여 중국 남방 차 문화의 상징이 되었습니다.","현재 의흥에는 약 3,000명의 도예 장인이 활동하고 있으며, 국가급 공예미술사부터 신예 작가까지 다양한 세대가 전통을 잇고 있습니다. 옥화당은 이 장인들과 직접 교류하며, 검증된 작품만을 엄선하여 소개합니다."]',
    isPublished: true,
  },
];

// ============================================================
// 니로타입 (NiloType)
// ============================================================
export interface SeedNiloType {
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string;
  productUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const niloTypes: SeedNiloType[] = [
  { name: 'Junni', nameKo: '주니', color: '#8B4513', region: '복건성 이싱 황룡산', description: '주철질의 대표 니료로, 적색 내지 황갈색을 띱니다. 내열성과 보온성이 뛰어나며, 차의 풍미를 극대화합니다.', characteristics: '["적색~황갈색","주철질","내열성 우수","보온성 우수","차 풍미 극대화"]', productUrl: '/products?clay=junni', sortOrder: 1, isActive: true },
  { name: 'Danji', nameKo: '단니', color: '#D4A574', region: '의흥 황룡산', description: '황토계열의 단단한 니료로, 밝은 황금빛을 띱니다. 은은한 향과 부드러운 맛을 표현하는 데 적합합니다.', characteristics: '["황금빛","황토질","경도 높음","은은한 향","부드러운 맛"]', productUrl: '/products?clay=danji', sortOrder: 2, isActive: true },
  { name: 'Jani', nameKo: '자니', color: '#2F4F4F', region: '의흥 황룡산', description: '청자질의 대표 니료로, 청록색 내지 암청색을 띱니다. 깊은 향과 시원한 맛을 자랑합니다.', characteristics: '["청록색~암청색","청자질","투기성 우수","깊은 향","시원한 맛"]', productUrl: '/products?clay=jani', sortOrder: 3, isActive: true },
  { name: 'Heugni', nameKo: '흑니', color: '#1C1C1C', region: '의흥 황룡산', description: '흑색 도자기 전용 니료로, 검은색을 띱니다. 떫은맛을 줄이고 깊은 맛을내는 특성이 있습니다.', characteristics: '["검은색","흑토질","세련된 맛","떫은맛 감소","깊은 맛"]', productUrl: '/products?clay=heugni', sortOrder: 4, isActive: true },
  { name: 'Cheongsu', nameKo: '청수니', color: '#4682B4', region: '장쑤성 이싱', description: '청수(정선) 지역 특유의 청백색 니료입니다. 산뜻한 맛과 깨끗한 향이 특징입니다.', characteristics: '["청백색","청수질","산뜻한 맛","깨끗한 향","Blanc de Chine"]', productUrl: '/products?clay=cheongsu', sortOrder: 5, isActive: true },
  { name: 'Nokni', nameKo: '녹니', color: '#556B2F', region: '운남성', description: '녹토계열의 독특한 니료로, 녹색기를 띱니다. 건강과 풍미를 동시에 생각하는 이들에게 사랑받습니다.', characteristics: '["녹토질","녹색기","건강 지향","톡쏘는 맛","특유의 신선함"]', productUrl: '/products?clay=nokni', sortOrder: 6, isActive: true },
];

// ============================================================
// 공정 (ProcessStep)
// ============================================================
export interface SeedProcessStep {
  step: number;
  title: string;
  description: string;
  detail: string;
}

export const processSteps: SeedProcessStep[] = [
  { step: 1, title: '채토 (採土)', description: '산지에서 원토를 채굴', detail: '자사호의 시작은 산지에서 원토를 채굴하는 것에서 시작됩니다. 황룡산 일대는 수천 년 동안 쌓인 뛰어난 자사 니료층을 지니고 있어, 채굴 가능한 구역이 한정되어 있습니다. 채굴은 수공업적으로 이루어지며, 니료의 품질에 따라 등급이 나뉩니다.' },
  { step: 2, title: '건조 (乾燥)', description: '채토한 니료를 말리는 과정', detail: '채굴한 원토는 깨끗한 물에 불려 악물,ثم غربلة 제거하여 결정질 혼합물을 만들고, затем 자연 건조시킵니다. 이 과정에서 남은 수분은 소성 시 균열을 일으킬 수 있어 충분한 건조가 필요합니다. 계절과 날씨에 따라 1~3개월이 소요됩니다.' },
  { step: 3, title: '성형 (成形)', description: '손으로 빚어 형상을 만드는 과정', detail: '건조된 니료는 고기锤과 방망이로 마무리 성형됩니다. 의흥 자사호의 장인들은 수세대에 걸친 기술으로, 한 치의 오차도 허용하지 않는 정밀함을 보여줍니다. 성형 방법에는 「拍身法」(두드리는 방법)과 「註浆法」(주입하는 방법)이 있습니다.' },
  { step: 4, title: '소성 (燒成)', description: '마지막으로 구워내어 완성', detail: '성형된 반건조물은 1100~1200°C의 가마에서 소성됩니다. 이 과정에서 니료가 유리질로 변해 내구성이 생기고, 고유한 색상과 질감이 발현됩니다. 소성 온도와 분위기에 따라 같은 니료라도 다른 색상이 나올 수 있어, 장인의 경험이 결정적입니다.' },
];

// ============================================================
// 아티스트 (Artist)
// ============================================================
export interface SeedArtist {
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  imageUrl: string | null;
  productUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const artists: SeedArtist[] = [
  { name: '진위명', title: '국가급 공예미술사', region: '복건성 이싱', story: '40년 경력의 진위명 장인은 복건성에서 가장 존경받는 자사호 장인 중 한 명입니다. 그의 작품은 전통적인 공정과 현대적인 감각을 결합하여, 사용자가 오랜 시간 사용할수록 광택이 나는 것이 특징입니다. 그의 말에 따르면 "호는 살아있다. 사용자가 키우는 것이다."', specialty: '주니 서시호', imageUrl: null, productUrl: '/products?artist=jin-weiming', sortOrder: 1, isActive: true },
  { name: '혜맹신', title: '인민공예미술사', region: '광동성 조주', story: '혜맹신은 소형 주전자 제작의 대가로, 그의 작품은 조주 공부차 문화의 상징이 되었습니다. 특히 100ml 미만의 초소형 호는 뜨거운 물을 한 번에만 담아내어, 차의 본연의 맛을 가장 순수하게 표현합니다. 그의 작품은 국제적으로 수집되고 있습니다.', specialty: '초소형 주니호', imageUrl: null, productUrl: '/products?artist=hui-mengshen', sortOrder: 2, isActive: true },
];

// ============================================================
// 페이지 (Page)
// ============================================================
export interface SeedPage {
  slug: string;
  title: string;
  template: string;
  isPublished: boolean;
}

export const pages: SeedPage[] = [
  { slug: 'home', title: '홈 메인 페이지', template: 'default', isPublished: true },
  { slug: 'exhibition', title: '봄 기획전 — 주니 신작 입고', template: 'default', isPublished: true },
  { slug: 'about', title: '브랜드 소개', template: 'default', isPublished: true },
  { slug: 'contact', title: '문의하기', template: 'default', isPublished: true },
  { slug: 'support', title: '고객센터', template: 'default', isPublished: true },
  { slug: 'shipping', title: '배송 안내', template: 'default', isPublished: true },
  { slug: 'returns', title: '반품 및 교환', template: 'default', isPublished: true },
  { slug: 'terms', title: '이용약관', template: 'default', isPublished: true },
  { slug: 'privacy', title: '개인정보처리방침', template: 'default', isPublished: true },
];
