'use client';

import EntitySelector from '../EntitySelector';
import { RadioField } from './FormFields';
import { PRODUCT_SELECT_MODE_OPTIONS } from './blockConfig';

/**
 * ProductGrid / ProductCarousel 블록에서 공통으로 사용하는
 * 카테고리 → (자동/수동) → 상품 선택 플로우.
 *
 * 저장 포맷은 기존과 동일:
 *   - content.category_id?: number
 *   - content.auto?: boolean
 *   - content.product_ids?: number[]
 */
interface ProductCategoryPickerProps {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}

export default function ProductCategoryPicker({ content, onChange }: ProductCategoryPickerProps) {
  const productIds = (content.product_ids as number[]) ?? [];
  const selectedCategoryId = content.category_id as number | undefined;
  const isAuto = content.auto === true;
  const hasCategory = selectedCategoryId !== undefined;

  function handleCategoryChange(ids: number[]) {
    const catId = ids[0] ?? undefined;
    const updates: Record<string, unknown> = { ...content, category_id: catId };
    if (catId === undefined) {
      updates.auto = undefined;
    }
    onChange(updates);
  }

  function handleAutoChange(val: string) {
    const newAuto = val === 'auto';
    const updates: Record<string, unknown> = { ...content, auto: newAuto };
    if (newAuto) {
      updates.product_ids = [];
    }
    onChange(updates);
  }

  return (
    <>
      <EntitySelector
        type="category"
        selectedIds={selectedCategoryId ? [selectedCategoryId] : []}
        onChange={handleCategoryChange}
        placeholder="카테고리 선택..."
      />
      {hasCategory && (
        <RadioField
          value={isAuto ? 'auto' : 'manual'}
          options={PRODUCT_SELECT_MODE_OPTIONS}
          onChange={handleAutoChange}
        />
      )}
      {(!hasCategory || !isAuto) && (
        <EntitySelector
          type="product"
          selectedIds={productIds}
          onChange={(ids) => onChange({ ...content, product_ids: ids })}
          placeholder={hasCategory ? '해당 카테고리 상품 검색...' : '상품 검색...'}
          categoryId={hasCategory ? selectedCategoryId : undefined}
        />
      )}
    </>
  );
}
