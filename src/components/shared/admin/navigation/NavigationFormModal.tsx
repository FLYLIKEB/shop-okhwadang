'use client';

import { X } from 'lucide-react';
import { useFormModal } from '@/components/shared/hooks/useFormModal';
import type { NavigationItem } from '@/lib/api';
import { GROUP_INFO, type NavGroup } from './navigationGroups';

export interface NavigationFormData {
  label: string;
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
  const defaults: NavigationFormData = {
    label: '',
    url: '',
    group,
    parent_id: null,
    is_active: true,
  };
  const modalInitial: NavigationFormData | null = initial
    ? { label: initial.label, url: initial.url, group, parent_id: initial.parent_id, is_active: initial.is_active }
    : null;
  const { formData, setFormData, loading, handleSubmit } = useFormModal(defaults, modalInitial, open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-1 text-lg font-semibold">
          {initial ? '메뉴 수정' : '새 메뉴 추가'}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {GROUP_INFO[group].label}에 표시될 메뉴를 {initial ? '수정' : '추가'}합니다.
        </p>

        <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
          <div>
            <label htmlFor="nav-label" className="mb-1 block text-sm font-medium">
              메뉴명 <span className="text-destructive">*</span>
            </label>
            <input
              id="nav-label"
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
              maxLength={100}
              placeholder="예: 상품목록, 이벤트, 고객센터"
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">쇼핑몰 메뉴에 표시될 이름입니다.</p>
          </div>

          <div>
            <label htmlFor="nav-url" className="mb-1 block text-sm font-medium">
              URL (링크 주소) <span className="text-destructive">*</span>
            </label>
            <input
              id="nav-url"
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
              maxLength={500}
              placeholder="예: /products, /event, https://외부링크.com"
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              내부 페이지는 <b>/products</b> 형태로, 외부 사이트는 <b>https://</b>로 시작하는 전체 주소를 입력하세요.
            </p>
          </div>

          <div>
            <label htmlFor="nav-parent" className="mb-1 block text-sm font-medium">
              상위 메뉴
            </label>
            <select
              id="nav-parent"
              value={formData.parent_id ?? ''}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">없음 (최상위 메뉴)</option>
              {flatItems
                .filter((i) => initial === null || i.id !== initial.id)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              상위 메뉴를 선택하면 해당 메뉴의 <b>하위(드롭다운) 메뉴</b>로 등록됩니다. 최상위 메뉴로 만들려면 &quot;없음&quot;을 선택하세요.
            </p>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                id="nav-active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="nav-active" className="text-sm font-medium">
                활성화 (쇼핑몰에 표시)
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground pl-6">
              체크 해제 시 메뉴가 쇼핑몰에서 숨겨집니다. 임시로 숨길 때 사용하세요.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
