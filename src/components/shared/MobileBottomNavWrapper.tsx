'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';
import MobileBottomNav from './MobileBottomNav';
import { handleApiError } from '@/utils/error';

export default function MobileBottomNavWrapper() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    settingsApi
      .getAll('general')
      .then((data) => {
        const setting = data.find((s) => s.key === 'mobile_bottom_nav_visible');
        setVisible(setting ? setting.value === 'true' : true);
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, '설정을 불러올 수 없습니다.'));
        setVisible(true);
      });
  }, []);

  if (visible === null) return null;
  if (!visible) return null;

  return <MobileBottomNav />;
}
