'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { adminCategoriesApi, adminProductsApi, attributesApi } from '@/lib/api';
import type {
  AdminCategory,
  AttributeType,
  AttributeValueOption,
  ProductDetail,
  ProductNoticeInfo,
} from '@/lib/api';
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
  categoryId: string;
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
  attributes: ProductAttributeDraft[];
  nameEn: string;
  descriptionEn: string;
  noticeInfo: ProductNoticeInfo;
}

interface ProductAttributeDraft {
  attributeTypeId: string;
  value: string;
  displayValue: string;
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

function flattenCategories(
  categories: AdminCategory[],
  depth = 0,
): Array<{ value: string; label: string }> {
  return categories.flatMap((category) => [
    {
      value: String(category.id),
      label: `${'— '.repeat(depth)}${category.name}${category.isActive ? '' : ' (숨김)'}`,
    },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function buildNoticeInfoPayload(
  noticeInfo: ProductNoticeInfo,
  hadNoticeInfo: boolean,
): ProductNoticeInfo | null | undefined {
  const entries = Object.entries(noticeInfo).filter(
    ([, value]) => typeof value === 'string' && value.trim().length > 0,
  );
  if (entries.length === 0) return hadNoticeInfo ? null : undefined;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  ) as ProductNoticeInfo;
}

interface ProductAttributeValueOption {
  value: string;
  displayValue: string | null;
}

function normalizeAttributeValueOption(
  option: string | AttributeValueOption,
): ProductAttributeValueOption {
  if (typeof option === 'string') {
    return { value: option.trim(), displayValue: null };
  }
  return {
    value: option.value.trim(),
    displayValue: option.displayValue?.trim() || null,
  };
}

function uniqueAttributeValueOptions(
  options: Array<string | AttributeValueOption>,
): ProductAttributeValueOption[] {
  const byValue = new Map<string, ProductAttributeValueOption>();
  for (const option of options) {
    const normalized = normalizeAttributeValueOption(option);
    if (!normalized.value) continue;
    const existing = byValue.get(normalized.value);
    if (!existing || (!existing.displayValue && normalized.displayValue)) {
      byValue.set(normalized.value, normalized);
    }
  }
  return Array.from(byValue.values());
}

function formatAttributeValueLabel(option: ProductAttributeValueOption): string {
  if (!option.displayValue || option.displayValue === option.value) return option.value;
  return `${option.displayValue} (${option.value})`;
}

async function loadAttributeValueOptions(
  attributeTypes: AttributeType[],
): Promise<Record<string, ProductAttributeValueOption[]>> {
  const settledValues = await Promise.allSettled(
    attributeTypes.map((type) => attributesApi.getTypeValues(type.code)),
  );

  return Object.fromEntries(
    attributeTypes.map((type, index) => {
      const remoteValues = settledValues[index];
      const existingValues = remoteValues?.status === 'fulfilled' ? remoteValues.value : [];
      return [
        String(type.id),
        uniqueAttributeValueOptions([...(type.validValues ?? []), ...existingValues]),
      ] as const;
    }),
  );
}

function NoticeInfoSection({ noticeInfo, set }: { noticeInfo: ProductNoticeInfo; set: Setter }) {
  const updateNoticeInfo = (key: NoticeInfoKey, value: string) => {
    if (key === 'type') {
      set('noticeInfo', {
        ...EMPTY_NOTICE_INFO,
        productName: noticeInfo.productName,
        manufacturer: noticeInfo.manufacturer,
        countryOfOrigin: noticeInfo.countryOfOrigin,
        handlingPrecautions: noticeInfo.handlingPrecautions,
        type: value === '' ? undefined : (value as ProductNoticeInfo['type']),
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
        <p className="text-xs text-muted-foreground">
          상품 목록에 표시될 이미지입니다. 드래그하여 순서를 변경할 수 있습니다.
        </p>
        <MultiImageUploader
          images={images}
          onChange={(imgs) => set('images', imgs)}
          maxImages={10}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">상품 상세 이미지</h2>
        <p className="text-xs text-muted-foreground">
          상품 상세 페이지 하단에 표시될 이미지입니다.
        </p>
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
  categoryOptions,
}: {
  form: Pick<ProductFormData, 'categoryId' | 'name' | 'slug' | 'shortDescription' | 'description'>;
  set: Setter;
  categoryOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">기본 정보</h2>

      <SelectField
        label="카테고리"
        value={form.categoryId}
        onChange={(v) => set('categoryId', v)}
        options={[{ value: '', label: '선택 안 함' }, ...categoryOptions]}
      />

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
        rows={8}
        placeholder="상품 상세 설명 (HTML 태그 사용 가능: p, br, strong, em, ul, ol, li, h2, h3, h4, a, img)"
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

function ProductAttributesSection({
  attributes,
  attributeTypes,
  attributeValueOptions,
  set,
}: {
  attributes: ProductAttributeDraft[];
  attributeTypes: AttributeType[];
  attributeValueOptions: Record<string, ProductAttributeValueOption[]>;
  set: Setter;
}) {
  const t = useTranslations('admin.productForm');
  const typeOptions = attributeTypes.map((type) => ({
    value: String(type.id),
    label: `${type.name} (${type.code})`,
  }));

  const update = (index: number, field: keyof ProductAttributeDraft, value: string) => {
    set(
      'attributes',
      attributes.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr)),
    );
  };

  const selectExistingValue = (index: number, option: ProductAttributeValueOption) => {
    set(
      'attributes',
      attributes.map((attr, i) => {
        if (i !== index) return attr;
        return {
          ...attr,
          value: option.value,
          displayValue: option.displayValue ?? option.value,
        };
      }),
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">상품 속성</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('attributePickerHelp')}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            set('attributes', [...attributes, { attributeTypeId: '', value: '', displayValue: '' }])
          }
          className="rounded-md bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
        >
          + 속성 추가
        </button>
      </div>
      {attributes.length === 0 && <p className="text-sm text-muted-foreground">속성이 없습니다.</p>}
      {attributes.map((attribute, index) => {
        const existingValues = attributeValueOptions[attribute.attributeTypeId] ?? [];
        return (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <SelectField
                label="속성"
                value={attribute.attributeTypeId}
                onChange={(value) => update(index, 'attributeTypeId', value)}
                options={[{ value: '', label: '선택' }, ...typeOptions]}
              />
              <TextField
                label="값"
                value={attribute.value}
                onChange={(value) => update(index, 'value', value)}
                placeholder="zhuni"
              />
              <TextField
                label="표시값"
                value={attribute.displayValue}
                onChange={(value) => update(index, 'displayValue', value)}
                placeholder="주니"
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    'attributes',
                    attributes.filter((_, i) => i !== index),
                  )
                }
                className="self-end rounded px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                삭제
              </button>
            </div>
            {attribute.attributeTypeId && existingValues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('existingAttributeValues')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingValues.map((option) => {
                    const selected = attribute.value === option.value;
                    const label = formatAttributeValueLabel(option);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => selectExistingValue(index, option)}
                        className={
                          selected
                            ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                            : 'rounded-full border px-3 py-1 text-xs hover:bg-secondary'
                        }
                        aria-pressed={selected}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default function ProductFormPage({ mode, product }: ProductFormPageProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [attributeValueOptions, setAttributeValueOptions] = useState<
    Record<string, ProductAttributeValueOption[]>
  >({});
  const hadNoticeInfo = product?.noticeInfo != null;
  const [form, setForm] = useState<ProductFormData>({
    categoryId: product?.category?.id != null ? String(product.category.id) : '',
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
    detailImages:
      product?.detailImages?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? [],
    options:
      product?.options?.map((o) => ({
        name: o.name,
        value: o.value,
        priceAdjustment: o.priceAdjustment,
        stock: o.stock,
      })) ?? [],
    attributes:
      product?.attributes?.map((attr) => ({
        attributeTypeId: String(attr.attributeTypeId),
        value: attr.value,
        displayValue: attr.displayValue ?? '',
      })) ?? [],
    nameEn: '',
    descriptionEn: '',
    noticeInfo: { ...EMPTY_NOTICE_INFO, ...(product?.noticeInfo ?? {}) },
  });

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminCategoriesApi.getAll(), attributesApi.getTypes()])
      .then(async ([categoryItems, attributeItems]) => {
        const valueOptions = await loadAttributeValueOptions(attributeItems);
        if (cancelled) return;
        setCategories(categoryItems);
        setAttributeTypes(attributeItems);
        setAttributeValueOptions(valueOptions);
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, toastMessage('productMetaLoadError')));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

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
        categoryId: form.categoryId ? Number(form.categoryId) : null,
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
        options: form.options
          .filter((option) => option.name.trim() && option.value.trim())
          .map((option, index) => ({
            name: option.name.trim(),
            value: option.value.trim(),
            priceAdjustment: Number(option.priceAdjustment) || 0,
            stock: Number(option.stock) || 0,
            sortOrder: index,
          })),
        attributes: form.attributes
          .filter((attribute) => attribute.attributeTypeId && attribute.value.trim())
          .map((attribute, index) => ({
            attributeTypeId: Number(attribute.attributeTypeId),
            value: attribute.value.trim(),
            displayValue: attribute.displayValue.trim() || attribute.value.trim(),
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
      <h1 className="mb-6 typo-h1">{mode === 'create' ? '상품 등록' : '상품 수정'}</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <ImagesSection images={form.images} detailImages={form.detailImages} set={set} />
        <BasicInfoSection form={form} set={set} categoryOptions={categoryOptions} />
        <MultilingualSection form={form} set={set} />
        <PricingSection form={form} set={set} />
        <VisibilitySection form={form} set={set} />
        <NoticeInfoSection noticeInfo={form.noticeInfo} set={set} />

        <section>
          <ProductOptionsEditor options={form.options} onChange={(opts) => set('options', opts)} />
        </section>
        <ProductAttributesSection
          attributes={form.attributes}
          attributeTypes={attributeTypes}
          attributeValueOptions={attributeValueOptions}
          set={set}
        />

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
