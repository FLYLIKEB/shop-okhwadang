import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useCarouselProgress } from '../useCarouselProgress';

function CarouselProgressHarness({ show }: { show: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { progress } = useCarouselProgress({ scrollRef });

  return (
    <div>
      {show ? <div ref={scrollRef} data-testid="scroller" /> : null}
      <span data-testid="progress">{progress.toFixed(2)}</span>
    </div>
  );
}

describe('useCarouselProgress', () => {
  it('로딩 후 scroller가 늦게 마운트되어도 스크롤 시 progress를 갱신한다', () => {
    const { rerender } = render(<CarouselProgressHarness show={false} />);
    expect(screen.getByTestId('progress')).toHaveTextContent('0.00');

    rerender(<CarouselProgressHarness show />);
    const scroller = screen.getByTestId('scroller');

    Object.defineProperty(scroller, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(scroller, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(scroller, 'scrollLeft', { value: 100, configurable: true, writable: true });

    fireEvent.scroll(scroller);

    expect(screen.getByTestId('progress')).toHaveTextContent('0.50');
  });
});
