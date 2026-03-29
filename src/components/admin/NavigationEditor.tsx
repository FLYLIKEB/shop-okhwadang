'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, Eye, EyeOff, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';

// --- 그룹별 설명 ---
const GROUP_INFO: Record<'gnb' | 'sidebar' | 'footer', { label: string; desc: string; preview: string }> = {
  gnb: {
    label: 'GNB (상단 메뉴)',
    desc: '쇼핑몰 상단 헤더에 항상 표시되는 주요 메뉴입니다. 방문자가 가장 먼저 보는 내비게이션으로, 상품목록·이벤트·브랜드 소개 등 핵심 페이지로 연결합니다.',
    preview: '홈  |  상품목록  |  이벤트  |  브랜드',
  },
  sidebar: {
    label: '사이드바 메뉴',
    desc: '모바일 햄버거 메뉴 또는 PC 좌측 사이드바에 표시되는 메뉴입니다. GNB보다 많은 항목을 담을 수 있으며, 카테고리·마이페이지·고객센터 등 보조 링크에 활용합니다.',
    preview: '≡  홈 / 상품목록 / 마이페이지 / 고객센터',
  },
  footer: {
    label: '푸터 메뉴',
    desc: '페이지 최하단 푸터 영역에 표시되는 링크 모음입니다. 이용약관·개인정보처리방침·회사소개 등 법적 안내 및 부가 정보 링크를 배치합니다.',
    preview: '이용약관  개인정보처리방침  고객센터  회사소개',
  },
};

// --- 미리보기 컴포넌트 ---
function NavigationPreview({
  group,
  items,
}: {
  group: 'gnb' | 'sidebar' | 'footer';
  items: NavigationItem[];
}) {
  const activeItems = items.filter((i) => i.is_active);

  if (group === 'gnb') {
    return (
      <div className="rounded-lg border bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-white">
          <span className="mr-4 font-bold text-white">로고</span>
          {activeItems.length === 0 ? (
            <span className="text-xs text-slate-400">(메뉴 없음)</span>
          ) : (
            activeItems.map((item) => (
              <span key={item.id} className="flex items-center gap-0.5 px-3 py-1 text-slate-200 hover:text-white text-xs">
                {item.label}
                {item.children.filter(c => c.is_active).length > 0 && (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  if (group === 'sidebar') {
    return (
      <div className="rounded-lg border bg-white shadow-md w-48 py-2 text-sm">
        {activeItems.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">(메뉴 없음)</p>
        ) : (
          activeItems.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between px-4 py-1.5 hover:bg-muted text-foreground text-xs">
                <span>{item.label}</span>
                {item.children.filter(c => c.is_active).length > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {item.children.filter(c => c.is_active).map(child => (
                <div key={child.id} className="px-8 py-1 text-xs text-muted-foreground hover:bg-muted">
                  {child.label}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  // footer
  return (
    <div className="rounded-lg border bg-slate-800 px-6 py-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        {activeItems.length === 0 ? (
          <span className="text-slate-500">(메뉴 없음)</span>
        ) : (
          activeItems.map((item) => (
            <span key={item.id} className="hover:text-white flex items-center gap-0.5">
              {item.label}
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          ))
        )}
      </div>
    </div>
  );
}

// --- SortableItem ---
interface SortableItemProps {
  item: NavigationItem;
  depth: number;
  onEdit: (item: NavigationItem) => void;
  onDelete: (item: NavigationItem) => void;
  onToggleActive: (item: NavigationItem) => void;
}

function SortableItem({ item, depth, onEdit, onDelete, onToggleActive }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-md border bg-background px-3 py-2 mb-1',
          isDragging && 'opacity-50',
          !item.is_active && 'opacity-50 bg-muted/30',
        )}
        style={{ marginLeft: depth * 24 }}
      >
        {depth > 0 && (
          <span className="text-xs text-muted-foreground">└</span>
        )}
        <button
          type="button"
          {...listeners}
          title="드래그하여 순서 변경"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex flex-1 flex-col min-w-0">
          <span className={cn('text-sm font-medium truncate', !item.is_active && 'line-through text-muted-foreground')}>
            {item.label}
          </span>
          <span className="text-xs text-muted-foreground truncate">{item.url}</span>
        </div>

        {item.children.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            하위 {item.children.length}
          </span>
        )}

        <button
          type="button"
          onClick={() => onToggleActive(item)}
          title={item.is_active ? '클릭하면 이 메뉴가 숨겨집니다 (비활성화)' : '클릭하면 이 메뉴가 표시됩니다 (활성화)'}
          className={cn('shrink-0', item.is_active ? 'text-green-600 hover:text-muted-foreground' : 'text-muted-foreground hover:text-green-600')}
          aria-label={item.is_active ? '비활성화' : '활성화'}
        >
          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          title="메뉴 이름·URL·상위 메뉴 수정"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="수정"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          title="메뉴 삭제 (하위 메뉴도 함께 삭제됩니다)"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <SortableItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Form Modal ---
interface NavigationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    label: string;
    url: string;
    group: 'gnb' | 'sidebar' | 'footer';
    parent_id: number | null;
    is_active: boolean;
  }) => Promise<void>;
  initial: NavigationItem | null;
  group: 'gnb' | 'sidebar' | 'footer';
  flatItems: NavigationItem[];
}

function NavigationFormModal({ open, onClose, onSubmit, initial, group, flatItems }: NavigationFormModalProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [parentId, setParentId] = useState<number | null>(initial?.parent_id ?? null);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ label, url, group, parent_id: parentId, is_active: isActive });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">
          {initial ? '메뉴 수정' : '새 메뉴 추가'}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {GROUP_INFO[group].label}에 표시될 메뉴를 {initial ? '수정' : '추가'}합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nav-label" className="mb-1 block text-sm font-medium">
              메뉴명 <span className="text-destructive">*</span>
            </label>
            <input
              id="nav-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
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
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
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
              disabled={submitting}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- NavigationEditor ---
interface NavigationEditorProps {
  group: 'gnb' | 'sidebar' | 'footer';
  items: NavigationItem[];
  onReload: () => Promise<void>;
  onCreate: (data: {
    label: string;
    url: string;
    group: 'gnb' | 'sidebar' | 'footer';
    parent_id: number | null;
    is_active: boolean;
  }) => Promise<void>;
  onUpdate: (id: number, data: {
    label?: string;
    url?: string;
    is_active?: boolean;
    parent_id?: number | null;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (orders: Array<{ id: number; sort_order: number }>) => Promise<void>;
}

function flattenItems(items: NavigationItem[]): NavigationItem[] {
  const result: NavigationItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children.length > 0) {
      result.push(...flattenItems(item.children));
    }
  }
  return result;
}

export default function NavigationEditor({
  group,
  items,
  onReload,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: NavigationEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NavigationItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flatItems = flattenItems(items);
  const rootIds = items.map((i) => i.id);
  const info = GROUP_INFO[group];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootIds.indexOf(Number(active.id));
    const newIndex = rootIds.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const orders = reordered.map((item, index) => ({
      id: Number(item.id),
      sort_order: index,
    }));

    await onReorder(orders);
    await onReload();
  };

  const handleEdit = (item: NavigationItem) => {
    setEditTarget(item);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (item: NavigationItem) => {
    await onUpdate(Number(item.id), { is_active: !item.is_active });
    await onReload();
  };

  const handleDeleteItem = async (item: NavigationItem) => {
    const hasChildren = item.children.length > 0;
    const msg = hasChildren
      ? `"${item.label}" 메뉴를 삭제하면 하위 메뉴 ${item.children.length}개도 함께 삭제됩니다.\n계속하시겠습니까?`
      : `"${item.label}" 메뉴를 삭제하시겠습니까?`;
    if (!window.confirm(msg)) return;
    await onDelete(Number(item.id));
    await onReload();
  };

  const handleSubmit = async (data: {
    label: string;
    url: string;
    group: 'gnb' | 'sidebar' | 'footer';
    parent_id: number | null;
    is_active: boolean;
  }) => {
    if (editTarget) {
      await onUpdate(Number(editTarget.id), {
        label: data.label,
        url: data.url,
        parent_id: data.parent_id,
        is_active: data.is_active,
      });
    } else {
      await onCreate(data);
    }
    await onReload();
  };

  return (
    <div>
      {/* 그룹 설명 */}
      <div className="mb-4 rounded-lg border bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-medium mb-0.5">ℹ️ {info.label}</p>
        <p className="text-xs leading-relaxed">{info.desc}</p>
      </div>

      {/* 액션 바 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            총 {flatItems.length}개 메뉴 ({items.filter(i => i.is_active).length}개 활성)
          </span>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              'flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors',
              showPreview ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? '미리보기 닫기' : '미리보기'}
          </button>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          메뉴 추가
        </button>
      </div>

      {/* 미리보기 */}
      {showPreview && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            쇼핑몰 미리보기 — 활성화된 메뉴만 표시됩니다
          </p>
          <NavigationPreview group={group} items={items} />
        </div>
      )}

      {/* 사용 안내 */}
      <div className="mb-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
        <p>⠿ <b>드래그</b>로 순서 변경 · 👁 아이콘으로 표시/숨김 · ✏️ 수정 · 🗑 삭제</p>
        <p>하위 메뉴는 수정 모달의 <b>상위 메뉴</b> 선택으로 만들 수 있습니다.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium text-foreground">등록된 메뉴가 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">우측 상단 &quot;메뉴 추가&quot; 버튼으로 첫 메뉴를 만들어보세요.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                depth={0}
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onToggleActive={handleToggleActive}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <NavigationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editTarget}
        group={group}
        flatItems={flatItems}
      />
    </div>
  );
}
