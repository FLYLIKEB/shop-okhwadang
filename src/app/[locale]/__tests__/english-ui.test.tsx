import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '@/i18n/messages/en.json';
import ProductNotFound from '../products/[id]/not-found';
import { generateMetadata as loginMetadata } from '../login/page';
import { generateMetadata as registerMetadata } from '../register/page';
import { generateMetadata as searchMetadata } from '../search/page';

const route = vi.hoisted(() => ({ locale: 'ko' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { namespace: 'auth' | 'search' | 'common' }) => createTranslator({
    locale: 'en', messages: en, namespace,
  }),
}));
vi.mock('@/components/shared/auth/LoginForm', () => ({ default: () => null }));
vi.mock('@/components/shared/auth/RegisterForm', () => ({ default: () => null }));
vi.mock('@/components/shared/search/SearchPage', () => ({ default: () => null }));

afterEach(cleanup);

describe('English customer UI with existing market routes', () => {
  it.each(['ko', 'en'])('shows English not-found text and preserves the %s home destination', (locale) => {
    route.locale = locale;
    render(<NextIntlClientProvider locale={locale} messages={en}><ProductNotFound /></NextIntlClientProvider>);
    expect(screen.getByRole('heading').textContent).not.toMatch(/[가-힣]/);
    expect(screen.getByRole('heading')).toHaveTextContent(en.ui.productNotFoundTitle);
    expect(screen.getByRole('link', { name: en.common.home })).toHaveAttribute('href', locale === 'en' ? '/en' : '/');
  });

  it('uses shared English metadata on Korean login, registration and search routes', async () => {
    const params = Promise.resolve({ locale: 'ko' });
    expect((await loginMetadata({ params, searchParams: Promise.resolve({}) })).title).toBe(en.auth.loginTitle);
    expect((await registerMetadata({ params })).title).toBe(en.auth.registerTitle);
    const metadata = await searchMetadata({ params, searchParams: Promise.resolve({ q: '주니' }) });
    expect(metadata.title).toBe(en.search.results.replace('{query}', '주니'));
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
