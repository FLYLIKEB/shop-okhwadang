'use client';

import { useTranslations } from 'next-intl';
import { AdminGuide } from '@/components/shared/admin/AdminGuide';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';

export default function AdminGuidePage() {
  const t = useTranslations('admin.guide');

  return (
    <div className="admin-guide mx-auto max-w-4xl space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} titleClassName="font-body" />
      <AdminGuide />
    </div>
  );
}
