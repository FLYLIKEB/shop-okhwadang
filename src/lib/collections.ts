export interface ClayCollection {
  id: string;
  name: string;
  nameKo: string;
  color: string;
  description: string;
  productUrl: string;
}

export interface ShapeCollection {
  id: string;
  name: string;
  description: string;
  productUrl: string;
}

export const CLAY_COLLECTIONS: ClayCollection[] = [
  {
    id: 'zuni',
    name: '朱泥',
    nameKo: '주니',
    color: '#8B4513',
    description: '철분 함량이 높아 소성 후 선명한 붉은색을 띠는 니료. 홍차·우롱에 최적.',
    productUrl: '/products?clayType=zhuni',
  },
  {
    id: 'danni',
    name: '段泥',
    nameKo: '단니',
    color: '#C4A882',
    description: '베이지·황토 계열의 온화한 색상. 기공이 균일하여 녹차·백차에 최적.',
    productUrl: '/products?clayType=danni',
  },
  {
    id: 'zini',
    name: '紫泥',
    nameKo: '자니',
    color: '#6B3A5C',
    description: '자사호의 대표 니료. 보라빛 갈색으로 보이차·암차에 최적.',
    productUrl: '/products?clayType=zini',
  },
  {
    id: 'heukni',
    name: '黑泥',
    nameKo: '흑니',
    color: '#2A2520',
    description: '희귀한 짙은 흑갈색 니료. 강한 흡착력으로 숙성 보이차에 최적.',
    productUrl: '/products?clayType=heini',
  },
  {
    id: 'chunsuni',
    name: '青水泥',
    nameKo: '청수니',
    color: '#3D6B6B',
    description: '회록색·청회색의 섬세한 질감. 깔끔한 차 맛으로 녹차·화차에 최적.',
    productUrl: '/products?clayType=qingshuini',
  },
  {
    id: 'nokni',
    name: '綠泥',
    nameKo: '녹니',
    color: '#4A6741',
    description: '극히 희귀한 담록색 니료. 낮은 수축률로 정밀 조형에 적합.',
    productUrl: '/products?clayType=lvni',
  },
];

export const SHAPE_COLLECTIONS: ShapeCollection[] = [
  {
    id: 'seosi',
    name: '서시형 (西施)',
    description: '둥글고 풍만한 곡선이 특징. 우아한 여성미를 담은 대표적 형태.',
    productUrl: '/products?teapotShape=xishi',
  },
  {
    id: 'seokpyo',
    name: '석표형 (石瓢)',
    description: '삼각 구도의 안정적 형태. 넓은 바닥과 직선적 라인이 특징.',
    productUrl: '/products?teapotShape=shipiao',
  },
  {
    id: 'inwang',
    name: '인왕형 (仁王)',
    description: '근엄하고 힘 있는 형태. 두툼한 벽과 넓은 주구가 특징.',
    productUrl: '/products?teapotShape=inwang',
  },
  {
    id: 'deokjong',
    name: '덕종형 (德鍾)',
    description: '단정하고 격조 있는 전통 형태. 균형 잡힌 비례가 특징.',
    productUrl: '/products?teapotShape=deokjong',
  },
  {
    id: 'supyeong',
    name: '수평형 (水平)',
    description: '수평으로 뜨는 구조. 기능적이며 실용적인 우림에 최적.',
    productUrl: '/products?teapotShape=supyeong',
  },
];
