'use client';

import { useMemo } from 'react';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import type { NavigationItem } from '@/lib/api';
import { GROUP_INFO, type NavGroup } from './navigationGroups';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';

export interface NavigationFormData {
  label: string;
  labelEn: string;
  url: string;
  group: NavGroup;
  parent_id: number | null;
  is_active: boolean;
}

interface NavigationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NavigationFormData) => Promise<void>;
  initial: NavigationItem | null;
  group: NavGroup;
  flatItems: NavigationItem[];
}

export default function NavigationFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  group,
  flatItems,
}: NavigationFormModalProps) {
  const defaults = useMemo<NavigationFormData>(() => ({
    label: '',
    labelEn: '',
    url: '',
    group,
    parent_id: null,
    is_active: true,
  }), [group]);

  const modalInitial = useMemo<NavigationFormData | null>(() => (
    initial
      ? { label: initial.label, labelEn: initial.labelEn ?? '', url: initial.url, group, parent_id: initial.parent_id, is_active: initial.is_active }
      : null
  ), [group, initial]);
  const { formData, setFormData, loading, handleSubmit } = useFormModal(defaults, modalInitial, open);

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md" className="p-7">
        <h2 className="mb-1 typo-h2 font-body">
          {initial ? '메뉴 수정' : '새 메뉴 추가'}
        </h2>
        <p className="mb-5 typo-body-sm text-muted-foreground">
          {GROUP_INFO[group].label}에 표시될 메뉴를 {initial ? '수정' : '추가'}합니다.
        </p>

        <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
          <FormInput
            id="nav-label"
            label="메뉴명"
            required
            type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              maxLength={100}
              placeholder="예: 상품목록, 이벤트, 고객센터"
            />
          <p className="-mt-2 typo-body-sm text-muted-foreground">쇼핑몰 메뉴에 표시될 이름입니다.</p>

          <FormInput
            id="nav-label-en"
            label="영문 메뉴명"
            type="text"
              value={formData.labelEn}
              onChange={(e) => setFormData({ ...formData, labelEn: e.target.value })}
              maxLength={100}
              placeholder="예: Products, Events, Customer Service"
            />
          <p className="-mt-2 typo-body-sm text-muted-foreground">/en 화면에 표시될 이름입니다. 비워두면 기본 메뉴명이 표시됩니다.</p>

          <FormInput
            id="nav-url"
            label="URL (링크 주소)"
            required
            type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              maxLength={500}
              placeholder="예: /products, /event, https://외부링크.com"
            />
          <p className="-mt-2 typo-body-sm text-muted-foreground">
              내부 페이지는 <b>/products</b> 형태로, 외부 사이트는 <b>https://</b>로 시작하는 전체 주소를 입력하세요.
          </p>

          <div>
            <FormSelect
              id="nav-parent"
              label="상위 메뉴"
              options={[
                { value: '', label: '없음 (최상위 메뉴)' },
                ...flatItems
                  .filter((i) => initial === null || i.id !== initial.id)
                  .map((i) => ({ value: String(i.id), label: i.label })),
              ]}
              value={formData.parent_id ?? ''}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? Number(e.target.value) : null })}
              className="border-soft rounded-xl py-3 typo-body-sm"
            />
            <p className="mt-1 typo-body-sm text-muted-foreground">
              상위 메뉴를 선택하면 해당 메뉴의 <b>하위(드롭다운) 메뉴</b>로 등록됩니다. 최상위 메뉴로 만들려면 &quot;없음&quot;을 선택하세요.
            </p>
          </div>

          <div className="surface-card px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                id="nav-active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="nav-active" className="typo-body-sm font-semibold">
                활성화 (쇼핑몰에 표시)
              </label>
            </div>
            <p className="mt-1 pl-6 typo-body-sm text-muted-foreground">
              체크 해제 시 메뉴가 쇼핑몰에서 숨겨집니다. 임시로 숨길 때 사용하세요.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
