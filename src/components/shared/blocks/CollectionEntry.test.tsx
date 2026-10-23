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

describe('CMS collection entries', () => {
  it('uses an article with an explicit text link instead of a linked card', () => {
    const { container, rerender } = render(
      <ImageCardGridBlock content={{ items: [imageItem], columns: 2, sectionTitle: 'Images' }} />,
    );

    expect(container.querySelector('article')).toHaveTextContent('Image card');
    expect(container.querySelector('a')).toBeNull();

    rerender(
      <ImageCardGridBlock content={{ items: [{ ...imageItem, href: '/images/1', hrefLabel: 'Read' }], columns: 2, sectionTitle: 'Images' }} />,
    );

    expect(screen.getByRole('link', { name: /read/i })).toHaveAttribute('href', '/images/1');
    expect(container.querySelector('article')).toContainElement(screen.getByRole('link', { name: /read/i }));
  });

  it('renders a real product photo for clay texture', () => {
    render(<ColorCardListBlock content={{ items: [{ ...colorItem, imageUrl: '/clay-photo.jpg' }], layout: 'grid-3' }} />);
    expect(screen.getByRole('img', { name: 'Color card' })).toHaveAttribute('src', '/clay-photo.jpg');
  });

  it('does not invent colored placeholders or perpetual loading cards when CMS items are empty', () => {
    const { container, rerender } = render(
      <ColorCardListBlock content={{ items: [colorItem], layout: 'grid-3', sectionTitle: 'Colors' }} />,
    );

    expect(container.querySelector('article')).toHaveTextContent('Color card');
    expect(container.querySelector('[style*="background"]')).toBeNull();

    rerender(<ColorCardListBlock content={{ items: [], layout: 'grid-3', sectionTitle: 'Colors' }} />);
    expect(container.querySelectorAll('.animate-skeleton-shimmer')).toHaveLength(0);
  });
});
