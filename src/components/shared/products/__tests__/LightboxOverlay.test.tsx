import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LightboxOverlay from '@/components/shared/products/LightboxOverlay';

const sampleImages = [
  { id: 1, url: '/img1.jpg', alt: '이미지1', sortOrder: 0, isThumbnail: true },
  { id: 2, url: '/img2.jpg', alt: '이미지2', sortOrder: 1, isThumbnail: false },
  { id: 3, url: '/img3.jpg', alt: null, sortOrder: 2, isThumbnail: false },
];

function makeBaseProps(overrides: Partial<React.ComponentProps<typeof LightboxOverlay>> = {}): React.ComponentProps<typeof LightboxOverlay> {
  return {
    images: sampleImages,
    selectedIndex: 0,
    onSelectIndex: vi.fn(),
    lightboxOpen: true,
    lightboxZoomed: false,
    setLightboxZoomed: vi.fn(),
    onClose: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    locale: 'ko',
    ...overrides,
  };
}

describe('LightboxOverlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<LightboxOverlay {...makeBaseProps({ lightboxOpen: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('portals the image and position indicator above the product page', () => {
    const { container } = render(<LightboxOverlay {...makeBaseProps()} />);
    expect(container.firstChild).toBeNull();
    const overlay = screen.getByText('1 / 3').closest('.product-lightbox-top-layer');
    expect(overlay?.parentElement).toBe(document.body);
  });

  it('contains tall images in a clipped frame without intercepting touch scrolling', () => {
    render(<LightboxOverlay {...makeBaseProps({ lightboxZoomed: true })} />);
    const image = screen.getByAltText('이미지1');
    const frame = image.parentElement?.parentElement;
    expect(frame).toHaveClass('h-[85vh]', 'w-[90vw]', 'overflow-hidden', 'touch-auto');
    expect(image).toHaveClass('object-contain');
    expect(image).toHaveAttribute('draggable', 'false');
    expect(image).toHaveStyle({ transform: 'scale(1.5)' });

    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    fireEvent(image, move);
    const wheel = new Event('wheel', { bubbles: true, cancelable: true });
    fireEvent(image, wheel);
    expect(move.defaultPrevented).toBe(false);
    expect(wheel.defaultPrevented).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('omits navigation for one image', () => {
    render(<LightboxOverlay {...makeBaseProps({ images: [sampleImages[0]] })} />);
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Image 1')).not.toBeInTheDocument();
  });

  it('closes through the close button', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('uses PREV/NEXT text controls without propagating to close', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    const prev = screen.getByLabelText('Previous image');
    const next = screen.getByLabelText('Next image');
    expect(prev).toHaveTextContent('PREV');
    expect(next).toHaveTextContent('NEXT');
    expect(prev.querySelector('svg')).toBeNull();
    expect(next.querySelector('svg')).toBeNull();
    await userEvent.click(prev);
    await userEvent.click(next);
    expect(props.onPrev).toHaveBeenCalledOnce();
    expect(props.onNext).toHaveBeenCalledOnce();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('selects an image through its position control', async () => {
    const props = makeBaseProps();
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByLabelText('Image 3'));
    expect(props.onSelectIndex).toHaveBeenCalledWith(2);
  });

  it.each([false, true])('photo clicks neither zoom nor close when zoomed=%s', async (lightboxZoomed) => {
    const props = makeBaseProps({ lightboxZoomed });
    render(<LightboxOverlay {...props} />);
    await userEvent.click(screen.getByAltText('이미지1'));
    expect(props.setLightboxZoomed).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it.each([false, true])('changes zoom only through the bottom-right text control when zoomed=%s', async (lightboxZoomed) => {
    const props = makeBaseProps({ lightboxZoomed });
    render(<LightboxOverlay {...props} />);
    const control = screen.getByLabelText(lightboxZoomed ? 'Zoom out' : 'Zoom in');
    expect(control).toHaveClass('bottom-4', 'right-4');
    expect(control.querySelector('svg')).toBeNull();
    await userEvent.click(control);
    expect(props.setLightboxZoomed).toHaveBeenCalledWith(!lightboxZoomed);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('uses a fallback alt for an unnamed image', () => {
    render(<LightboxOverlay {...makeBaseProps({ selectedIndex: 2 })} />);
    expect(screen.getByAltText('Product image')).toBeInTheDocument();
  });
});
