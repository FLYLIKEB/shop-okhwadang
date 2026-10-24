import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PersonCardListBlock from './PersonCardListBlock';

const item = { id: 'artist', name: 'Artist', imageUrl: '/portrait.jpg', title: 'Maker', story: '<b>Saved story</b>', href: '/products?categoryId=20', hrefLabel: 'View pieces' };

describe('PersonCardListBlock media recovery', () => {
  it('keeps server-rendered content and the selected CMS portrait', () => {
    expect(renderToString(<PersonCardListBlock content={{ items: [item] }} />)).toContain('Saved story');
    render(<PersonCardListBlock content={{ items: [item] }} />);
    expect(screen.getByRole('img', { name: 'Artist' })).toHaveAttribute('src', '/portrait.jpg');
  });

  it('removes a failed media frame while preserving the story and link', () => {
    const { container, rerender } = render(<PersonCardListBlock content={{ items: [item] }} />);
    fireEvent.error(screen.getByRole('img', { name: 'Artist' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('article .aspect-square')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Artist' })).toBeInTheDocument();
    expect(screen.getByText('Saved story')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View pieces' })).toHaveAttribute('href', item.href);

    rerender(<PersonCardListBlock content={{ items: [{ ...item, imageUrl: '/new-portrait.jpg' }] }} />);
    expect(screen.getByRole('img', { name: 'Artist' })).toHaveAttribute('src', '/new-portrait.jpg');
  });

  it('does not reserve a blank portrait frame when the CMS has no image', () => {
    const { container } = render(<PersonCardListBlock content={{ items: [{ ...item, imageUrl: '' }] }} />);
    expect(container.querySelector('article .aspect-square')).toBeNull();
    expect(screen.getByText('Saved story')).toBeInTheDocument();
  });
});
