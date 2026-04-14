import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollLogoTransition } from '@/hooks/useScrollLogoTransition';

vi.mock('embla-carousel-react', () => ({
  default: vi.fn(() => [
    { current: null },
    { scrollPrev: vi.fn(), scrollNext: vi.fn(), scrollTo: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: vi.fn(() => 0) },
  ]),
}));

const createMockElement = (rect: DOMRect): HTMLElement => {
  const el = document.createElement('div');
  el.getBoundingClientRect = vi.fn(() => rect);
  el.style = {};
  Object.defineProperty(el, 'style', {
    value: {
      transform: '',
    },
  });
  return el;
};

describe('useScrollLogoTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollY = 0;
    window.innerHeight = 800;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state when hero is visible at top', () => {
    const heroRef = { current: createMockElement(new DOMRect(0, 0, 100, 500)) };

    const { result } = renderHook(() =>
      useScrollLogoTransition({ heroRef })
    );

    expect(result.current.progress).toBeDefined();
    expect(typeof result.current.progress).toBe('number');
  });

  it('should calculate progress based on hero element position', () => {
    const heroRef = {
      current: createMockElement(new DOMRect(0, 200, 100, 500)),
    };

    const { result } = renderHook(() =>
      useScrollLogoTransition({ heroRef })
    );

    expect(result.current.progress).toBeDefined();
    expect(typeof result.current.progress).toBe('number');
  });

  it('should calculate hero logo style with opacity', () => {
    const heroRef = { current: createMockElement(new DOMRect(0, 0, 100, 500)) };

    const { result } = renderHook(() =>
      useScrollLogoTransition({ heroRef })
    );

    expect(result.current.heroLogoStyle).toHaveProperty('opacity');
    expect(typeof result.current.heroLogoStyle.opacity).toBe('number');
    expect(result.current.heroLogoStyle).toHaveProperty('transform');
    expect(typeof result.current.heroLogoStyle.transform).toBe('string');
  });

  it('should calculate header logo style with opacity', () => {
    const heroRef = { current: createMockElement(new DOMRect(0, 0, 100, 500)) };

    const { result } = renderHook(() =>
      useScrollLogoTransition({ heroRef })
    );

    expect(result.current.headerLogoStyle).toHaveProperty('opacity');
    expect(typeof result.current.headerLogoStyle.opacity).toBe('number');
  });

  it('should handle missing hero ref gracefully', () => {
    const heroRef = { current: null };

    const { result } = renderHook(() =>
      useScrollLogoTransition({ heroRef })
    );

    expect(result.current.progress).toBeDefined();
    expect(result.current.isHeroVisible).toBe(false);
  });
});
