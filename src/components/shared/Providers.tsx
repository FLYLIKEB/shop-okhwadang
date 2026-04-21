'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LogoScrollProvider } from '@/components/shared/contexts/LogoScrollContext';
import { GlobalLoadingProvider } from '@/contexts/GlobalLoadingContext';
import GlobalLoadingBar from '@/components/shared/layout/GlobalLoadingBar';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
}

export default function Providers({ children, locale }: ProvidersProps) {
  return (
    <ThemeProvider locale={locale}>
      <AuthProvider>
        <CartProvider>
          <GlobalLoadingProvider>
            <LogoScrollProvider>
              <GlobalLoadingBar />
              {children}
            </LogoScrollProvider>
          </GlobalLoadingProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
