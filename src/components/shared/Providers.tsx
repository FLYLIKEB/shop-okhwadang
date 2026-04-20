'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LogoScrollProvider } from '@/components/shared/contexts/LogoScrollContext';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
}

export default function Providers({ children, locale }: ProvidersProps) {
  return (
    <ThemeProvider locale={locale}>
      <AuthProvider>
        <CartProvider>
          <LogoScrollProvider>
            {children}
          </LogoScrollProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
