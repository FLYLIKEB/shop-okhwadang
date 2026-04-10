'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import MobileBottomNav from './MobileBottomNav';

export default function MobileBottomNavWrapper() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    settingsApi
      .getAll('general')
      .then((data) => {
        const setting = data.find((s) => s.key === 'mobile_bottom_nav_visible');
        setVisible(setting ? setting.value === 'true' : true);
      })
      .catch(() => setVisible(true));
  }, []);

  if (visible === null) return null;
  if (!visible) return null;

  return <MobileBottomNav />;
}
