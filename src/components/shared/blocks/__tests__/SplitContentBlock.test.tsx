import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SplitContentBlock from '../SplitContentBlock';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));

describe('SplitContentBlock', () => {
  it('renders the CMS image, introduction, description and CTA in one section', async () => {
    render(<SplitContentBlock content={{ title: 'Our story', subtitle: 'Ockhwadang', description: '<p>Brand story description</p>', image_url: '/story.jpg', image_derivatives: { desktop: '/story.webp' }, cta_text: 'Read more', cta_url: '/p/about', use_alternate_bg: true }} />);
    expect(screen.getByRole('img', { name: 'Our story' })).toHaveAttribute('src', '/story.webp');
    expect(screen.getByText('Ockhwadang')).toBeInTheDocument();
    expect(await screen.findByText('Brand story description')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute('href', '/p/about');
  });

  it('keeps text available without inventing an image and blocks unsafe CTA URLs', () => {
    render(<SplitContentBlock content={{ title: 'Text story', image_url: '', cta_text: 'Read more', cta_url: 'javascript:alert(1)' }} />);
    expect(screen.getByRole('heading', { name: 'Text story' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute('href', '#');
  });
});
