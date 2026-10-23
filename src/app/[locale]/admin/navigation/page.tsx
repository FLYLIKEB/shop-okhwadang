'use client';

import { localMessage } from '@/utils/localMessages';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminNavigationApi, adminSettingsApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import type { NavigationItem } from '@/lib/api';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import NavigationEditor from '@/components/shared/admin/NavigationEditor';
import { toastMessage } from '@/utils/toastMessages';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { AdminLoadingState } from '@/components/shared/admin/AdminStates';

type NavGroup = 'gnb' | 'sidebar' | 'footer';

const TABS: { label: string; value: NavGroup; hint: string }[] = [
  { label: localMessage('adminEnglish.gnbTop'), value: 'gnb', hint: localMessage('adminEnglish.headerNavigation') },
  { label: localMessage('adminEnglish.sidebar'), value: 'sidebar', hint: localMessage('adminEnglish.mobileHamburgerAndDesktopSideMenus') },
  { label: localMessage('adminEnglish.footer'), value: 'footer', hint: localMessage('adminEnglish.footerLinks') },
];

export default function AdminNavigationPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<NavGroup>('gnb');
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [bottomNavVisible, setBottomNavVisible] = useState(true);

  const { execute: loadItems, isLoading: loading } = useAsyncAction(
    async (group: NavGroup) => {
      const data = await adminNavigationApi.getByGroup(group);
      setItems(data);
    },
    { errorMessage: localMessage('adminEnglish.unableToLoadNavigationItems') },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadItems(activeTab);
    }
  }, [isAdmin, activeTab, loadItems]);

  const { execute: loadBottomNav, isLoading: bottomNavLoading } = useAsyncAction(
    async () => {
      const settings = await adminSettingsApi.getAll('general');
      const setting = settings.find((s) => s.key === 'mobile_bottom_nav_visible');
      setBottomNavVisible(setting ? setting.value === 'true' : true);
    },
    { errorMessage: localMessage('adminEnglish.unableToLoadNavigationSettings') },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadBottomNav();
    }
  }, [isAdmin, loadBottomNav]);

  const handleReload = async () => {
    await loadItems(activeTab);
  };

  const handleCreate = async (data: {
    label: string;
    labelEn?: string | null;
    url: string;
    group: NavGroup;
    parent_id: number | null;
    is_active: boolean;
  }) => {
    try {
      await adminNavigationApi.create(data);
      toast.success(toastMessage('menuCreated'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('addError')));
      throw err;
    }
  };

  const handleUpdate = async (id: number, data: {
    label?: string;
    labelEn?: string | null;
    url?: string;
    is_active?: boolean;
    parent_id?: number | null;
  }) => {
    try {
      await adminNavigationApi.update(id, data);
      toast.success(toastMessage('menuUpdated'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('editError')));
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminNavigationApi.remove(id);
      toast.success(toastMessage('menuDeleted'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('deleteError')));
      throw err;
    }
  };

  const handleReorder = async (orders: Array<{ id: number; sort_order: number }>) => {
    try {
      await adminNavigationApi.reorder(orders);
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('sortError')));
      throw err;
    }
  };

  const handleBottomNavToggle = async (visible: boolean) => {
    try {
      await adminSettingsApi.bulkUpdate([{ key: 'mobile_bottom_nav_visible', value: String(visible) }]);
      setBottomNavVisible(visible);
      toast.success(toastMessage('bottomNavVisibilityChanged', { visibility: toastMessage(visible ? 'visible' : 'hidden') }));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('settingsSaveError')));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <AdminLoadingState title={localMessage('adminEnglish.loadingNavigation')} className="surface-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title={localMessage('admin.navigation.title')}
        description={localMessage('adminEnglish.organizeStorefrontMenusByAreaAndPreview')}
      />

      <section className="surface-card flex items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="typo-body font-semibold">{localMessage('navigation.mobileBottomNav')}</span>
          <span className="typo-body-sm text-muted-foreground">
            {localMessage('adminEnglish.showFixedNavigationAtTheBottomOf')}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          role="switch"
          aria-checked={bottomNavVisible}
          disabled={bottomNavLoading}
          onClick={() => handleBottomNavToggle(!bottomNavVisible)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            bottomNavVisible ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
              bottomNavVisible ? 'translate-x-6 bg-primary-foreground' : 'translate-x-1 bg-foreground'
            }`}
          />
        </Button>
      </section>

      <div className="flex gap-1 rounded-xl bg-muted/70 p-1" role="tablist" aria-label={localMessage('adminEnglish.navigationArea')}>
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
            title={tab.hint}
            role="tab"
            aria-selected={activeTab === tab.value}
            className="h-auto min-h-10 flex-1 flex-col items-start gap-0 rounded-lg px-4 py-2 text-left"
          >
            <span className="typo-body-sm font-semibold">{tab.label}</span>
            <span className="typo-label font-normal opacity-70">{tab.hint}</span>
          </Button>
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
