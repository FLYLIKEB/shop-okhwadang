/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
// jsdom does not implement IntersectionObserver — provide a class stub
class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
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
