'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail, ProductNoticeInfo } from '@/lib/api';
import MultiImageUploader from './MultiImageUploader';
import ProductOptionsEditor, { type ProductOptionDraft } from './ProductOptionsEditor';
import { CheckboxField, SelectField, TextAreaField, TextField } from './FormField';
import { toastMessage } from '@/utils/toastMessages';

interface GalleryImage {
  url: string;
  alt?: string;
}

interface DetailImage {
  url: string;
  alt?: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: string;
  salePrice: string;
  stock: string;
  sku: string;
  status: 'draft' | 'active' | 'soldout' | 'hidden';
  isFeatured: boolean;
  isFreeShipping: boolean;
  images: GalleryImage[];
  detailImages: DetailImage[];
  options: ProductOptionDraft[];
  nameEn: string;
  descriptionEn: string;
  noticeInfo: ProductNoticeInfo;
}

interface ProductFormPageProps {
  mode: 'create' | 'edit';
  product?: ProductDetail;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '임시저장' },
  { value: 'active', label: '판매중' },
  { value: 'soldout', label: '품절' },
  { value: 'hidden', label: '숨김' },
] as const;

const NOTICE_TYPE_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: 'teaware', label: '자사호/다구' },
  { value: 'tea', label: '차류/식품류' },
] as const;

const EMPTY_NOTICE_INFO: ProductNoticeInfo = {
  type: undefined,
  productName: '',
  material: '',
  components: '',
  sizeCapacity: '',
  manufacturer: '',
  countryOfOrigin: '',
  handlingPrecautions: '',
  warrantyPolicy: '',
  asContact: '',
  foodType: '',
  producer: '',
  origin: '',
  manufactureDate: '',
  expirationDate: '',
  storageMethod: '',
  ingredients: '',
  customerServicePhone: '',
};

type Setter = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;

type NoticeInfoKey = keyof ProductNoticeInfo;

function buildNoticeInfoPayload(noticeInfo: ProductNoticeInfo, hadNoticeInfo: boolean): ProductNoticeInfo | null | undefined {
  const entries = Object.entries(noticeInfo).filter(([, value]) => typeof value === 'string' && value.trim().length > 0);
  if (entries.length === 0) return hadNoticeInfo ? null : undefined;
  return Object.fromEntries(entries.map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as ProductNoticeInfo;
}

function NoticeInfoSection({
  noticeInfo,
  set,
}: {
  noticeInfo: ProductNoticeInfo;
  set: Setter;
}) {
  const updateNoticeInfo = (key: NoticeInfoKey, value: string) => {
    if (key === 'type') {
      set('noticeInfo', {
        ...EMPTY_NOTICE_INFO,
        productName: noticeInfo.productName,
        manufacturer: noticeInfo.manufacturer,
        countryOfOrigin: noticeInfo.countryOfOrigin,
        handlingPrecautions: noticeInfo.handlingPrecautions,
        type: value === '' ? undefined : value as ProductNoticeInfo['type'],
      });
      return;
    }

    set('noticeInfo', {
      ...noticeInfo,
      [key]: value,
    });
  };

  const commonFields = [
    ['productName', '품명 및 모델명', '옥화당 자사호'] as const,
    ['manufacturer', '제조자/수입자', '옥화당'] as const,
    ['countryOfOrigin', '제조국', '중국'] as const,
    ['handlingPrecautions', '취급 시 주의사항', '강한 충격을 피해주세요.'] as const,
  ];
  const teawareFields = [
    ['material', '재질', '자사니'] as const,
    ['components', '구성품', '자사호 1점, 보관함 1점'] as const,
    ['sizeCapacity', '크기/용량', '150ml'] as const,
    ['warrantyPolicy', '품질보증기준', '관련 법 및 소비자분쟁해결기준에 따름'] as const,
    ['asContact', 'A/S 책임자와 전화번호', '고객센터 010-2908-0393'] as const,
  ];
  const teaFields = [
    ['foodType', '식품 유형', '침출차'] as const,
    ['producer', '생산자/수입자', '옥화당'] as const,
    ['origin', '원산지', '중국 운남성'] as const,
    ['manufactureDate', '제조연월일', '별도 표기'] as const,
    ['expirationDate', '소비기한', '별도 표기'] as const,
    ['storageMethod', '보관방법', '직사광선을 피하고 서늘한 곳에 보관'] as const,
    ['ingredients', '원재료명', '차엽 100%'] as const,
    ['customerServicePhone', '소비자상담 전화번호', '010-2908-0393'] as const,
  ];
  const typedFields = noticeInfo.type === 'tea' ? teaFields : teawareFields;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">상품고시정보</h2>
      <SelectField
        label="고시정보 유형"
        value={noticeInfo.type ?? ''}
        onChange={(value) => updateNoticeInfo('type', value)}
        options={NOTICE_TYPE_OPTIONS}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...commonFields, ...typedFields].map(([key, label, placeholder]) => (
          <TextField
            key={key}
            label={label}
            value={noticeInfo[key] ?? ''}
            onChange={(value) => updateNoticeInfo(key, value)}
            placeholder={placeholder}
          />
        ))}
      </div>
    </section>
  );
}

function ImagesSection({
  images,
  detailImages,
  set,
}: {
  images: GalleryImage[];
  detailImages: DetailImage[];
  set: Setter;
}) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">갤러리 이미지</h2>
        <p className="text-xs text-muted-foreground">상품 목록에 표시될 이미지입니다. 드래그하여 순서를 변경할 수 있습니다.</p>
        <MultiImageUploader
          images={images}
          onChange={(imgs) => set('images', imgs)}
          maxImages={10}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">상품 상세 이미지</h2>
        <p className="text-xs text-muted-foreground">상품 상세 페이지 하단에 표시될 이미지입니다.</p>
        <MultiImageUploader
          images={detailImages}
          onChange={(imgs) => set('detailImages', imgs)}
          maxImages={20}
        />
      </section>
    </>
  );
}

function BasicInfoSection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'name' | 'slug' | 'shortDescription' | 'description'>;
  set: Setter;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">기본 정보</h2>

      <TextField
        label="상품명"
        required
        value={form.name}
        onChange={(v) => set('name', v)}
        placeholder="상품명을 입력하세요"
      />
      <TextField
        label="슬러그"
        required
        value={form.slug}
        onChange={(v) => set('slug', v)}
        placeholder="url-friendly-slug"
      />
      <TextField
        label="짧은 설명"
        value={form.shortDescription}
        onChange={(v) => set('shortDescription', v)}
        placeholder="상품 요약 설명"
      />
      <TextAreaField
        label="상세 설명"
        value={form.description}
        onChange={(v) => set('description', v)}
        rows={5}
        placeholder="상품 상세 설명"
      />
    </section>
  );
}

function MultilingualSection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'nameEn' | 'descriptionEn'>;
  set: Setter;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">다국어 정보</h2>

      <div className="grid grid-cols-1 gap-4">
        <TextField
          label="상품명 (영어)"
          value={form.nameEn}
          onChange={(v) => set('nameEn', v)}
          placeholder="Product name in English"
        />
      </div>

      <TextAreaField
        label="상세 설명 (영어)"
        value={form.descriptionEn}
        onChange={(v) => set('descriptionEn', v)}
        placeholder="Product description in English"
      />
    </section>
  );
}

function PricingSection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'price' | 'salePrice' | 'stock' | 'sku'>;
  set: Setter;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">가격 / 재고</h2>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="판매가 (원)"
          required
          type="number"
          value={form.price}
          onChange={(v) => set('price', v)}
          min={1}
        />
        <TextField
          label="할인가 (원)"
          type="number"
          value={form.salePrice}
          onChange={(v) => set('salePrice', v)}
          min={0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="재고"
          type="number"
          value={form.stock}
          onChange={(v) => set('stock', v)}
          min={0}
        />
        <TextField
          label="SKU"
          value={form.sku}
          onChange={(v) => set('sku', v)}
          placeholder="재고 관리 코드"
        />
      </div>
    </section>
  );
}

function VisibilitySection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'status' | 'isFeatured' | 'isFreeShipping'>;
  set: Setter;
}) {
  const t = useTranslations('admin.productForm');

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">노출 설정</h2>

      <SelectField
        label="상태"
        value={form.status}
        onChange={(v) => set('status', v)}
        options={STATUS_OPTIONS}
      />

      <CheckboxField
        label="추천 상품으로 표시"
        checked={form.isFeatured}
        onChange={(v) => set('isFeatured', v)}
      />

      <CheckboxField
        label={t('freeShippingProduct')}
        checked={form.isFreeShipping}
        onChange={(v) => set('isFreeShipping', v)}
      />
    </section>
  );
}

export default function ProductFormPage({ mode, product }: ProductFormPageProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const hadNoticeInfo = product?.noticeInfo != null;
  const [form, setForm] = useState<ProductFormData>({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    shortDescription: product?.shortDescription ?? '',
    price: product ? String(product.price) : '',
    salePrice: product?.salePrice != null ? String(product.salePrice) : '',
    stock: product ? String(product.stock) : '0',
    sku: product?.sku ?? '',
    status: (product?.status as ProductFormData['status']) ?? 'draft',
    isFeatured: product?.isFeatured ?? false,
    isFreeShipping: product?.isFreeShipping ?? false,
    images: product?.images?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? [],
    detailImages: product?.detailImages?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? [],
    options: product?.options?.map((o) => ({
      name: o.name,
      value: o.value,
      priceAdjustment: o.priceAdjustment,
      stock: o.stock,
    })) ?? [],
    nameEn: '',
    descriptionEn: '',
    noticeInfo: { ...EMPTY_NOTICE_INFO, ...(product?.noticeInfo ?? {}) },
  });

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error(toastMessage('productNameRequired'));
      return;
    }
    if (!form.slug.trim()) {
      toast.error(toastMessage('slugRequired'));
      return;
    }
    if (!form.price || Number(form.price) < 1) {
      toast.error(toastMessage('validPriceRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description || undefined,
        shortDescription: form.shortDescription || undefined,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        stock: Number(form.stock),
        sku: form.sku || undefined,
        status: form.status,
        isFeatured: form.isFeatured,
        isFreeShipping: form.isFreeShipping,
        nameEn: form.nameEn.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        noticeInfo: buildNoticeInfoPayload(form.noticeInfo, hadNoticeInfo),
        images: form.images.map((img, index) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: index,
          isThumbnail: index === 0,
        })),
        detailImages: form.detailImages.map((img, index) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: index,
        })),
      };

      if (mode === 'create') {
        await adminProductsApi.create(payload);
        toast.success(toastMessage('productCreated'));
      } else if (product) {
        await adminProductsApi.update(product.id, payload);
        toast.success(toastMessage('productUpdated'));
      }
      router.push('/admin/products');
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 typo-h1">
        {mode === 'create' ? '상품 등록' : '상품 수정'}
      </h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <ImagesSection images={form.images} detailImages={form.detailImages} set={set} />
        <BasicInfoSection form={form} set={set} />
        <MultilingualSection form={form} set={set} />
        <PricingSection form={form} set={set} />
        <VisibilitySection form={form} set={set} />
        <NoticeInfoSection noticeInfo={form.noticeInfo} set={set} />

        <section>
          <ProductOptionsEditor
            options={form.options}
            onChange={(opts) => set('options', opts)}
          />
        </section>

        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="rounded-lg border px-6 py-2 text-sm hover:bg-secondary"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? '저장 중...' : mode === 'create' ? '등록하기' : '수정하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
