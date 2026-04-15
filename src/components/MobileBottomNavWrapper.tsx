'use client';

import { useEffect, useState } from 'react';
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
    fetch('/api/settings?group=general')
      .then((res) => res.json())
      .then((data: Array<{ key: string; value: string }>) => {
        const setting = data.find((s) => s.key === 'mobile_bottom_nav_visible');
        setClientVisible(setting ? setting.value === 'true' : true);
      })
      .catch(() => setClientVisible(true));
  }, [visible]);

  if (clientVisible === null) return null;
  if (!clientVisible) return null;

  return <MobileBottomNav />;
}
