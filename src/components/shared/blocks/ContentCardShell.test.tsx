import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColorCardListBlock from './ColorCardListBlock';
import ImageCardGridBlock from './ImageCardGridBlock';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const imageItem = {
  id: 'image-1',
  imageUrl: '',
  name: 'Image card',
  description: 'Description',
};

const colorItem = {
  id: 'color-1',
  color: '#123456',
  nameKo: 'Color card',
  description: 'Description',
};

describe('CMS content card shell', () => {
  it('keeps image cards as articles without href and links with href', () => {
    const { container, rerender } = render(
      <ImageCardGridBlock content={{ items: [imageItem], columns: 2, sectionTitle: 'Images' }} />,
    );

    expect(container.querySelector('article')).toHaveTextContent('Image card');
    expect(container.querySelector('a')).toBeNull();

    rerender(
      <ImageCardGridBlock content={{ items: [{ ...imageItem, href: '/images/1', hrefLabel: 'Read' }], columns: 2, sectionTitle: 'Images' }} />,
    );

    expect(screen.getByRole('link', { name: /read/i })).toHaveAttribute('href', '/images/1');
    expect(container.querySelector('article')).toBeNull();
  });

  it('keeps color grid cards linked and preserves the requested skeleton count', () => {
    const { container, rerender } = render(
      <ColorCardListBlock content={{ items: [colorItem], layout: 'grid-3', sectionTitle: 'Colors' }} />,
    );

    expect(container.querySelector('article')).toHaveTextContent('Color card');

    rerender(<ColorCardListBlock content={{ items: [], layout: 'grid-3', sectionTitle: 'Colors' }} />);
    expect(container.querySelectorAll('.animate-skeleton-shimmer')).toHaveLength(12);
  });
});
