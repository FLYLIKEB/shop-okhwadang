'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { adminNavigationApi, adminSettingsApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
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
  const [loading, setLoading] = useState(true);
  const [bottomNavVisible, setBottomNavVisible] = useState(true);
  const [bottomNavLoading, setBottomNavLoading] = useState(true);

  const loadItems = useCallback(async (group: NavGroup) => {
    setLoading(true);
    try {
      const data = await adminNavigationApi.getByGroup(group);
      setItems(data);
    } catch {
      toast.error('네비게이션 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadItems(activeTab);
    }
  }, [isAdmin, activeTab, loadItems]);

  useEffect(() => {
    if (isAdmin) {
      setBottomNavLoading(true);
      adminSettingsApi.getAll('general')
        .then((settings) => {
          const setting = settings.find((s) => s.key === 'mobile_bottom_nav_visible');
          setBottomNavVisible(setting ? setting.value === 'true' : true);
        })
        .catch(() => setBottomNavVisible(true))
        .finally(() => setBottomNavLoading(false));
    }
  }, [isAdmin]);

  const handleReload = async () => {
    await loadItems(activeTab);
  };

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

  const handleBottomNavToggle = async (visible: boolean) => {
    try {
      await adminSettingsApi.bulkUpdate([{ key: 'mobile_bottom_nav_visible', value: String(visible) }]);
      setBottomNavVisible(visible);
      toast.success(`하단 네비게이션이 ${visible ? '표시' : '숨김'} 처리되었습니다.`);
    } catch (err) {
      toast.error(handleApiError(err, '설정 저장에 실패했습니다.'));
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

      <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">모바일 하단 네비게이션</span>
          <span className="text-xs text-muted-foreground">
            모바일 화면 하단에 고정된 탐색 메뉴를 표시합니다.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={bottomNavVisible}
          disabled={bottomNavLoading}
          onClick={() => handleBottomNavToggle(!bottomNavVisible)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            bottomNavVisible ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              bottomNavVisible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

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
