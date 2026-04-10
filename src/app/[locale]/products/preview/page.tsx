import type { Metadata } from 'next'
import type { ProductDetail } from '@/lib/api'
import ProductDetailClient from '@/components/products/ProductDetailClient'

export const metadata: Metadata = {
  title: '상품 상세 프리뷰 — 옥화당',
  robots: { index: false },
}

const DUMMY_PRODUCT: ProductDetail = {
  id: 0,
  name: '주니 서시호 — 홍상설 작',
  slug: 'preview-zuni-xishi',
  price: 480000,
  salePrice: 420000,
  status: 'active',
  isFeatured: true,
  viewCount: 0,
  rating: 4.5,
  reviewCount: 12,
  stock: 3,
  sku: 'ZN-SS-HSS-120',
  shortDescription: '의흥 원광주니 단산 태토. 홍상설 선생 친제. 용량 120ml, 출수 8공.',
  description: `
<h2>주니 서시호</h2>
<p>
  의흥(宜興) 황룡산 원광주니(原礦朱泥)를 사용한 서시(西施) 형태의 소용 자사호입니다.
  홍상설(洪上雪) 선생이 직접 흙을 준비하고 성형·낙인 전 과정을 직접 작업한 친제작(親製作) 호입니다.
</p>
<h3>니료(泥料)</h3>
<p>
  원광주니는 황룡산 특산 니료로, 소성 후 선홍빛 주황색을 띠며 밀도가 높고 투기성이 뛰어납니다.
  장기 양호 시 색택이 더욱 깊어지는 것이 특징입니다.
</p>
<h3>형태(造型)</h3>
<p>
  서시(西施)형은 중국 사대 미인 서시의 이름에서 유래한 둥글고 풍만한 형태입니다.
  뚜껑과 몸체의 비례, 주구의 각도가 조화롭고 그립이 편안합니다.
</p>
<h3>사용 추천 차</h3>
<p>주니 특성상 노숙보이(老熟普洱), 암차(岩茶), 단총(單叢) 등 발효·반발효차에 적합합니다.</p>
<h3>양호(養壺) 안내</h3>
<p>
  첫 사용 전 맑은 물에 20분 끓인 뒤 사용하세요.
  세제 사용을 금하며, 사용 후 뚜껑을 열어 통풍 건조하세요.
</p>
  `.trim(),
  category: {
    id: 1,
    name: '자사호',
    slug: 'yixing-teapot',
    description: null,
    parentId: null,
    imageUrl: null,
  },
  options: [
    { id: 1, name: '용량', value: '120ml (기본)', priceAdjustment: 0, stock: 2, sortOrder: 1 },
    { id: 2, name: '용량', value: '150ml (+20,000원)', priceAdjustment: 20000, stock: 1, sortOrder: 2 },
  ],
  images: [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      alt: '주니 서시호 정면',
      sortOrder: 1,
      isThumbnail: true, isDescriptionImage: false,
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
      alt: '주니 서시호 측면',
      sortOrder: 2,
      isThumbnail: false, isDescriptionImage: false,
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
      alt: '주니 서시호 손에 쥔 사이즈',
      sortOrder: 3,
      isThumbnail: false, isDescriptionImage: false,
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1523920290228-4f321a939b4c?w=800&q=80',
      alt: '주니 서시호 찻자리 세팅',
      sortOrder: 4,
      isThumbnail: false, isDescriptionImage: false,
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80',
      alt: '주니 서시호 낙관 클로즈업',
      sortOrder: 5,
      isThumbnail: false, isDescriptionImage: false,
    },
  ],
  detailImages: [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
      alt: '주니 서시호 상세정보 1',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200&q=80',
      alt: '주니 서시호 상세정보 2',
      sortOrder: 2,
      isActive: true,
    },
  ],
  attributes: [
    { id: 1, attributeTypeId: 1, value: 'zhuni', displayValue: '주니', sortOrder: 0 },
    { id: 2, attributeTypeId: 2, value: 'xishi', displayValue: '서시', sortOrder: 1 },
  ],
}

export default function ProductPreviewPage() {
  return <ProductDetailClient product={DUMMY_PRODUCT} />
}
