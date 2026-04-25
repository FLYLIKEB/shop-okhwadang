import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LightboxOverlay from '@/components/shared/products/LightboxOverlay';
import { useLightboxInteraction } from '@/components/shared/hooks/useLightboxInteraction';

const sampleImages = [
  { id: 1, url: '/img1.jpg', alt: '이미지1', sortOrder: 0, isThumbnail: true },
  { id: 2, url: '/img2.jpg', alt: '이미지2', sortOrder: 1, isThumbnail: false },
  { id: 3, url: '/img3.jpg', alt: null, sortOrder: 2, isThumbnail: false },
];

function makeBaseProps(overrides: Partial<React.ComponentProps<typeof LightboxOverlay>> = {}) {
  // 기본 ref 들
  const lightboxPanRef = { current: { x: 0, y: 0 } } as React.MutableRefObject<{ x: number; y: number }>;
  const isDragging = { current: false } as React.MutableRefObject<boolean>;

  return {
    images: sampleImages,
    selectedIndex: 0,
    onSelectIndex: vi.fn(),
    lightboxOpen: true,
    lightboxZoomed: false,
    setLightboxZoomed: vi.fn(),
    lightboxPanRef,
    lightboxImageStyle: {},
    onClose: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    handleLightboxMouseDown: vi.fn(),
    handleLightboxMouseMove: vi.fn(),
    handleLightboxMouseUp: vi.fn(),
    handleLightboxTouchStart: vi.fn(),
    handleLightboxTouchMove: vi.fn(),
    handleLightboxTouchEnd: vi.fn(),
    isDragging,
    ...overrides,
  };
}

describe('LightboxOverlay', () => {
  it('lightboxOpen=false 면 null 반환 (DOM 없음)', () => {
    const { container } = render(<LightboxOverlay {...makeBaseProps({ lightboxOpen: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('인덱스 표시 — "1 / 3"', () => {
    render(<LightboxOverlay {...makeBaseProps()} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('이미지 1장이면 prev/next 버튼/도트 미렌더', () => {
    render(<LightboxOverlay {...makeBaseProps({ images: [sampleImages[0]] })} />);
    expect(screen.queryByLabelText('이전 이미지')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('다음 이미지')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/이미지 \d+/)).not.toBeInTheDocument();
  });

  it('닫기 버튼 클릭 → onClose', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByLabelText('닫기'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('이전/다음 버튼 클릭 → onPrev/onNext 만 호출 (close 전파 X)', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByLabelText('이전 이미지'));
    expect(props.onPrev).toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText('다음 이미지'));
    expect(props.onNext).toHaveBeenCalled();
  });

  it('도트 클릭 → onSelectIndex(i) 호출', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByLabelText('이미지 3'));
    expect(props.onSelectIndex).toHaveBeenCalledWith(2);
  });

  it('확대 버튼 클릭 → setLightboxZoomed(true) 호출', async () => {
    const setLightboxZoomed = vi.fn();
    render(
      <LightboxOverlay
        {...makeBaseProps({ lightboxZoomed: false, setLightboxZoomed })}
      />,
    );
    await userEvent.click(screen.getByLabelText('확대'));
    expect(setLightboxZoomed).toHaveBeenCalledWith(true);
  });

  it('이미 확대된 상태 → 축소 버튼 + setLightboxZoomed(false) + pan 초기화', async () => {
    const setLightboxZoomed = vi.fn();
    const lightboxPanRef = { current: { x: 50, y: 50 } } as React.MutableRefObject<{ x: number; y: number }>;
    render(
      <LightboxOverlay
        {...makeBaseProps({ lightboxZoomed: true, setLightboxZoomed, lightboxPanRef })}
      />,
    );
    await userEvent.click(screen.getByLabelText('축소'));
    expect(setLightboxZoomed).toHaveBeenCalledWith(false);
    expect(lightboxPanRef.current).toEqual({ x: 0, y: 0 });
  });

  it('selectedImage 의 alt 가 null 이면 기본 "상품 이미지" 사용', () => {
    render(<LightboxOverlay {...makeBaseProps({ selectedIndex: 2 })} />);
    expect(screen.getByAltText('상품 이미지')).toBeInTheDocument();
  });

  it('마우스 이벤트 → 핸들러 호출', () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    const image = screen.getByAltText('이미지1');
    const interactiveContainer = image.closest('[style*="cursor"]') as HTMLElement;
    fireEvent.mouseDown(interactiveContainer);
    fireEvent.mouseMove(interactiveContainer);
    fireEvent.mouseUp(interactiveContainer);
    expect(props.handleLightboxMouseDown).toHaveBeenCalled();
    expect(props.handleLightboxMouseMove).toHaveBeenCalled();
    expect(props.handleLightboxMouseUp).toHaveBeenCalled();
  });
});

describe('useLightboxInteraction', () => {
  it('초기 상태: zoomed=false, pan={0,0}', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    expect(result.current.lightboxZoomed).toBe(false);
    expect(result.current.lightboxPan).toEqual({ x: 0, y: 0 });
  });

  it('setLightboxZoomed(true) → zoomed=true', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));
    expect(result.current.lightboxZoomed).toBe(true);
  });

  it('zoomed=true 일 때 mouseDown → mouseMove 시 pan 업데이트', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));

    act(() => {
      result.current.handleLightboxMouseDown({
        clientX: 0,
        clientY: 0,
      } as React.MouseEvent);
    });
    act(() => {
      result.current.handleLightboxMouseMove({
        clientX: 50,
        clientY: 30,
      } as React.MouseEvent);
    });
    expect(result.current.lightboxPan).toEqual({ x: 50, y: 30 });
  });

  it('mouseMove pan 은 maxPan=150 으로 클램핑', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));
    act(() => result.current.handleLightboxMouseDown({ clientX: 0, clientY: 0 } as React.MouseEvent));
    act(() => result.current.handleLightboxMouseMove({ clientX: 9999, clientY: -9999 } as React.MouseEvent));
    expect(result.current.lightboxPan).toEqual({ x: 150, y: -150 });
  });

  it('zoomed=false 면 mouseMove 무시', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => {
      result.current.handleLightboxMouseMove({ clientX: 100, clientY: 100 } as React.MouseEvent);
    });
    expect(result.current.lightboxPan).toEqual({ x: 0, y: 0 });
  });

  it('mouseUp → isDragging.current=false', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));
    act(() => result.current.handleLightboxMouseDown({ clientX: 0, clientY: 0 } as React.MouseEvent));
    expect(result.current.isDragging.current).toBe(true);
    act(() => result.current.handleLightboxMouseUp());
    expect(result.current.isDragging.current).toBe(false);
  });

  it('resetLightboxState → zoom 초기화 + pan 초기화', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));
    act(() => result.current.handleLightboxMouseDown({ clientX: 0, clientY: 0 } as React.MouseEvent));
    act(() => result.current.handleLightboxMouseMove({ clientX: 30, clientY: 30 } as React.MouseEvent));
    expect(result.current.lightboxPan).toEqual({ x: 30, y: 30 });

    act(() => result.current.resetLightboxState());
    expect(result.current.lightboxZoomed).toBe(false);
    expect(result.current.lightboxPan).toEqual({ x: 0, y: 0 });
    expect(result.current.lightboxPanRef.current).toEqual({ x: 0, y: 0 });
  });

  it('touchMove pan 은 maxPan=100 으로 클램핑', () => {
    const { result } = renderHook(() => useLightboxInteraction());
    act(() => result.current.setLightboxZoomed(true));
    act(() => {
      result.current.handleLightboxTouchStart({
        touches: [{ clientX: 0, clientY: 0 }],
      } as unknown as React.TouchEvent);
    });
    act(() => {
      result.current.handleLightboxTouchMove({
        touches: [{ clientX: 500, clientY: -500 }],
      } as unknown as React.TouchEvent);
    });
    expect(result.current.lightboxPan).toEqual({ x: 100, y: -100 });
  });
});

