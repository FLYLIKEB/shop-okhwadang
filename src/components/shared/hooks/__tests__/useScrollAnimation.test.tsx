import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollAnimation } from '@/components/shared/hooks/useScrollAnimation';

function Harness({ once = false }: { once?: boolean }) {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>({ once });
  return (
    <div>
      <div ref={ref}>target</div>
      <span>{visible ? 'visible' : 'hidden'}</span>
    </div>
  );
}

describe('useScrollAnimation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays visible and does not observe when reduced motion is preferred', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const observe = vi.fn();
    window.IntersectionObserver = vi.fn(function MockIntersectionObserver() {
      return {
        observe,
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    }) as unknown as typeof IntersectionObserver;

    render(<Harness />);

    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(observe).not.toHaveBeenCalled();
  });

  it('updates visibility from IntersectionObserver and disconnects on unmount', () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();

    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    window.IntersectionObserver = vi.fn(function MockIntersectionObserver(cb: IntersectionObserverCallback) {
      callback = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect,
      };
    }) as unknown as typeof IntersectionObserver;

    const { unmount } = render(<Harness />);

    act(() => {
      callback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(screen.getByText('hidden')).toBeInTheDocument();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('unobserves the target after the first intersection when once=true', () => {
    let callback: IntersectionObserverCallback | undefined;
    const unobserve = vi.fn();

    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    window.IntersectionObserver = vi.fn(function MockIntersectionObserver(cb: IntersectionObserverCallback) {
      callback = cb;
      return {
        observe: vi.fn(),
        unobserve,
        disconnect: vi.fn(),
      };
    }) as unknown as typeof IntersectionObserver;

    render(<Harness once />);

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(unobserve).toHaveBeenCalled();
  });
});
