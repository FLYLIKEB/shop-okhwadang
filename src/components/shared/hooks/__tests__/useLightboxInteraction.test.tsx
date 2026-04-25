import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLightboxInteraction } from '@/components/shared/hooks/useLightboxInteraction';

function mouseEvent(clientX: number, clientY: number) {
  return { clientX, clientY } as React.MouseEvent;
}

function touchEvent(clientX: number, clientY: number) {
  return { touches: [{ clientX, clientY }] } as unknown as React.TouchEvent;
}

describe('useLightboxInteraction', () => {
  it('ignores drag gestures until zoom is enabled', () => {
    const { result } = renderHook(() => useLightboxInteraction());

    act(() => {
      result.current.handleLightboxMouseDown(mouseEvent(10, 10));
      result.current.handleLightboxMouseMove(mouseEvent(200, 200));
    });

    expect(result.current.lightboxPan).toEqual({ x: 0, y: 0 });
    expect(result.current.isDragging.current).toBe(false);
  });

  it('pans a zoomed image and clamps mouse movement', () => {
    const { result } = renderHook(() => useLightboxInteraction());

    act(() => {
      result.current.setLightboxZoomed(true);
    });
    act(() => {
      result.current.handleLightboxMouseDown(mouseEvent(0, 0));
      result.current.handleLightboxMouseMove(mouseEvent(999, -999));
    });

    expect(result.current.lightboxPan).toEqual({ x: 150, y: -150 });

    act(() => {
      result.current.handleLightboxMouseUp();
    });
    expect(result.current.isDragging.current).toBe(false);
  });

  it('supports touch panning and reset', () => {
    const { result } = renderHook(() => useLightboxInteraction());

    act(() => {
      result.current.setLightboxZoomed(true);
    });

    act(() => {
      result.current.handleLightboxTouchStart(touchEvent(0, 0));
      result.current.handleLightboxTouchMove(touchEvent(-250, 250));
    });

    expect(result.current.lightboxPan).toEqual({ x: -100, y: 100 });

    act(() => {
      result.current.handleLightboxTouchEnd();
      result.current.resetLightboxState();
    });

    expect(result.current.lightboxZoomed).toBe(false);
    expect(result.current.lightboxPan).toEqual({ x: 0, y: 0 });
    expect(result.current.lightboxPanRef.current).toEqual({ x: 0, y: 0 });
  });
});
