'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminNavigationApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { NavigationItem } from '@/lib/api';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import NavigationEditor from '@/components/admin/NavigationEditor';

type NavGroup = 'gnb' | 'sidebar' | 'footer';

const TABS: { label: string; value: NavGroup; hint: string }[] = [
  { label: 'GNB (상단)', value: 'gnb', hint: '헤더 상단 메뉴' },
  { label: '사이드바', value: 'sidebar', hint: '모바일 햄버거·PC 사이드 메뉴' },
  { label: '푸터', value: 'footer', hint: '하단 링크 모음' },
];

export default function AdminNavigationPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<NavGroup>('gnb');
  const [items, setItems] = useState<NavigationItem[]>([]);

  const { execute: loadItems, isLoading: loading } = useAsyncAction(
    async (group: NavGroup) => {
      const data = await adminNavigationApi.getByGroup(group);
      setItems(data);
    },
    { errorMessage: '네비게이션 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadItems(activeTab);
    }
  }, [isAdmin, activeTab, loadItems]);

  const handleReload = () => loadItems(activeTab);

  const handleCreate = async (data: {
    label: string;
    url: string;
    group: NavGroup;
    parent_id: number | null;
    is_active: boolean;
  }) => {
    try {
      await adminNavigationApi.create(data);
      toast.success('메뉴가 추가되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '추가에 실패했습니다.'));
      throw err;
    }
  };

  const handleUpdate = async (id: number, data: {
    label?: string;
    url?: string;
    is_active?: boolean;
    parent_id?: number | null;
  }) => {
    try {
      await adminNavigationApi.update(id, data);
      toast.success('메뉴가 수정되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '수정에 실패했습니다.'));
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminNavigationApi.remove(id);
      toast.success('메뉴가 삭제되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '삭제에 실패했습니다.'));
      throw err;
    }
  };

  const handleReorder = async (orders: Array<{ id: number; sort_order: number }>) => {
    try {
      await adminNavigationApi.reorder(orders);
    } catch (err) {
      toast.error(handleApiError(err, '순서 변경에 실패했습니다.'));
      throw err;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">네비게이션 관리</h1>

      <p className="mb-4 text-sm text-muted-foreground">
        쇼핑몰의 메뉴 구조를 관리합니다. 탭을 선택해 각 영역의 메뉴를 추가·수정·삭제·순서 변경하세요.
      </p>

      <div className="mb-6 flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            title={tab.hint}
            className={`flex flex-col items-start px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{tab.hint}</span>
          </button>
        ))}
      </div>

      <NavigationEditor
        group={activeTab}
        items={items}
        onReload={handleReload}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
    </div>
  );
}
