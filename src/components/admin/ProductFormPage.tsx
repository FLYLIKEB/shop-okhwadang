'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminProductsApi } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import MultiImageUploader from './MultiImageUploader';
import ProductOptionsEditor, { type ProductOptionDraft } from './ProductOptionsEditor';

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
  images: GalleryImage[];
  detailImages: DetailImage[];
  options: ProductOptionDraft[];
  name_en: string;
  name_ja: string;
  name_zh: string;
  description_en: string;
  description_ja: string;
  description_zh: string;
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

const INPUT_CLASS = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

type Setter = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;

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

      <div>
        <label className="mb-1 block text-sm font-medium">상품명 *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="상품명을 입력하세요"
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">슬러그 *</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value)}
          placeholder="url-friendly-slug"
          required
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">짧은 설명</label>
        <input
          type="text"
          value={form.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          placeholder="상품 요약 설명"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">상세 설명</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          placeholder="상품 상세 설명"
          className={INPUT_CLASS}
        />
      </div>
    </section>
  );
}

function MultilingualSection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'name_en' | 'name_ja' | 'name_zh' | 'description_en' | 'description_ja' | 'description_zh'>;
  set: Setter;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">다국어 정보</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">상품명 (영어)</label>
          <input
            type="text"
            value={form.name_en}
            onChange={(e) => set('name_en', e.target.value)}
            placeholder="Product name in English"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">상품명 (일본어)</label>
          <input
            type="text"
            value={form.name_ja}
            onChange={(e) => set('name_ja', e.target.value)}
            placeholder="日本語の商品名"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">상품명 (중국어)</label>
          <input
            type="text"
            value={form.name_zh}
            onChange={(e) => set('name_zh', e.target.value)}
            placeholder="中文商品名称"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">상세 설명 (영어)</label>
        <textarea
          value={form.description_en}
          onChange={(e) => set('description_en', e.target.value)}
          rows={3}
          placeholder="Product description in English"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">상세 설명 (일본어)</label>
        <textarea
          value={form.description_ja}
          onChange={(e) => set('description_ja', e.target.value)}
          rows={3}
          placeholder="日本語の商品説明"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">상세 설명 (중국어)</label>
        <textarea
          value={form.description_zh}
          onChange={(e) => set('description_zh', e.target.value)}
          rows={3}
          placeholder="中文商品描述"
          className={INPUT_CLASS}
        />
      </div>
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
        <div>
          <label className="mb-1 block text-sm font-medium">판매가 (원) *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            min={1}
            required
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">할인가 (원)</label>
          <input
            type="number"
            value={form.salePrice}
            onChange={(e) => set('salePrice', e.target.value)}
            min={0}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">재고</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            min={0}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">SKU</label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            placeholder="재고 관리 코드"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </section>
  );
}

function VisibilitySection({
  form,
  set,
}: {
  form: Pick<ProductFormData, 'status' | 'isFeatured'>;
  set: Setter;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">노출 설정</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">상태</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as ProductFormData['status'])}
          className={INPUT_CLASS}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isFeatured}
          onChange={(e) => set('isFeatured', e.target.checked)}
          className="h-4 w-4"
        />
        추천 상품으로 표시
      </label>
    </section>
  );
}

export default function ProductFormPage({ mode, product }: ProductFormPageProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
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
    images: product?.images?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? [],
    detailImages: product?.detailImages?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? [],
    options: product?.options?.map((o) => ({
      name: o.name,
      value: o.value,
      priceAdjustment: o.priceAdjustment,
      stock: o.stock,
    })) ?? [],
    name_en: '',
    name_ja: '',
    name_zh: '',
    description_en: '',
    description_ja: '',
    description_zh: '',
  });

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('상품명을 입력해주세요.');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('슬러그를 입력해주세요.');
      return;
    }
    if (!form.price || Number(form.price) < 1) {
      toast.error('가격을 올바르게 입력해주세요.');
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
        name_en: form.name_en.trim() || undefined,
        name_ja: form.name_ja.trim() || undefined,
        name_zh: form.name_zh.trim() || undefined,
        description_en: form.description_en.trim() || undefined,
        description_ja: form.description_ja.trim() || undefined,
        description_zh: form.description_zh.trim() || undefined,
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
        toast.success('상품이 등록되었습니다.');
      } else if (product) {
        await adminProductsApi.update(product.id, payload);
        toast.success('상품이 수정되었습니다.');
      }
      router.push('/admin/products');
    } catch (err) {
      toast.error(handleApiError(err, '저장에 실패했습니다.'));
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
