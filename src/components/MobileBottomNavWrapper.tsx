'use client';

import { useEffect, useState } from 'react';
import MobileBottomNav from './MobileBottomNav';

export default function MobileBottomNavWrapper() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/settings?group=general')
      .then((res) => res.json())
      .then((data: Array<{ key: string; value: string }>) => {
        const setting = data.find((s) => s.key === 'mobile_bottom_nav_visible');
        setVisible(setting ? setting.value === 'true' : true);
      })
      .catch(() => setVisible(true));
  }, []);

  if (visible === null) return null;
  if (!visible) return null;

  return <MobileBottomNav />;
}
