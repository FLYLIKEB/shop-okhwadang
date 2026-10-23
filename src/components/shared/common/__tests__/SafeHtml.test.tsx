import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SafeHtml from '../SafeHtml';

describe('SafeHtml theme compatibility', () => {
  it('allows theme overrides while preserving authored colors, layout and background images', async () => {
    render(<SafeHtml className="text-white" html={`
      <p style="color: black !important; background-color: white !important; border: 1px solid black !important; padding: 12px !important">Content</p>
      <div style="background: white url(https://example.com/photo.jpg) !important">Photo panel</div>
      <img alt="Photo" src="https://example.com/photo.jpg" style="background-color: white !important" />
      <script>alert('unsafe')</script>
    `} />);

    const content = await screen.findByText('Content');
    expect(content.closest('.theme-rich-html')).toHaveClass('text-white');
    expect(content.style.color).toBe('black');
    expect(content.style.backgroundColor).toBe('white');
    for (const property of ['color', 'background-color', 'border']) {
      expect(content.style.getPropertyPriority(property)).toBe('');
    }
    expect(content.style.getPropertyPriority('padding')).toBe('important');
    expect(screen.getByText('Photo panel').style.backgroundImage).toContain('photo.jpg');
    expect(screen.getByAltText('Photo').style.getPropertyPriority('background-color')).toBe('important');
    expect(content.parentElement?.querySelector('script')).toBeNull();
  });

  it('keeps the theme marker when content updates', async () => {
    const { rerender } = render(<SafeHtml html="<p>Before</p>" />);
    await screen.findByText('Before');
    rerender(<SafeHtml html="<p>After</p>" />);
    await waitFor(() => expect(screen.getByText('After').closest('.theme-rich-html')).not.toBeNull());
  });
});
