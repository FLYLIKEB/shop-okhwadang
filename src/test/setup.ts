/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';
import { afterEach } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));


vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  notFound: vi.fn(),
}));

vi.mock('@/i18n/navigation', () => {
  const localizeHref = (href: unknown, locale?: string) => {
    const value = typeof href === 'string' ? href : String(href);
    return locale && value.startsWith('/') ? `/${locale}${value}` : value;
  };

  return {
    Link: ({
      children,
      href,
      locale,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: unknown; locale?: string }) =>
      React.createElement('a', { href: localizeHref(href, locale), ...props }, children),
    redirect: vi.fn(),
    usePathname: () => '/',
    useRouter: () => ({
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
      push: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
    }),
  };
});

// jsdom does not implement window.matchMedia — provide a stub so tests can spy on it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});


// jsdom does not implement ResizeObserver — provide a class stub
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: ResizeObserverCallback) {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});
Element.prototype.scrollTo = vi.fn();

// jsdom does not implement IntersectionObserver — provide a class stub
class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
