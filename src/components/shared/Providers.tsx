'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { LogoScrollProvider } from '@/components/shared/contexts/LogoScrollContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <LogoScrollProvider>
          {children}
        </LogoScrollProvider>
      </CartProvider>
    </AuthProvider>
  );
}
