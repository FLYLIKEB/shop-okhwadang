'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import MobileBottomNav from './MobileBottomNav';

interface MobileBottomNavWrapperProps {
  visible?: boolean;
}

export default function MobileBottomNavWrapper({ visible = true }: MobileBottomNavWrapperProps) {
  const [clientVisible, setClientVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!visible) {
      setClientVisible(false);
      return;
    }

    let cancelled = false;

    settingsApi
      .getAll('general')
      .then((data) => {
        if (cancelled) return;

        const setting = data.find((item) => item.key === 'mobile_bottom_nav_visible');
        setClientVisible(setting ? setting.value === 'true' : false);
      })
      .catch(() => {
        if (!cancelled) {
          setClientVisible(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (clientVisible === null || !clientVisible) {
    return null;
  }

  return <MobileBottomNav />;
}
