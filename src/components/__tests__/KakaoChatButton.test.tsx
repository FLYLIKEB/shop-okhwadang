import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KakaoChatButton from '@/components/shared/KakaoChatButton';
import { MobileNavProvider } from '@/contexts/MobileNavContext';

let pathname = '/ko/products';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const chatUrl = 'https://pf.kakao.com/_xfxmxdIX/chat';

describe('KakaoChatButton', () => {
  it('opens the Ockhwadang chat in a protected new tab without recently viewed items', () => {
    pathname = '/ko/products';
    render(<KakaoChatButton />);
    const link = screen.getByRole('link', { name: /KakaoTalk/ });
    expect(link).toHaveAttribute('href', chatUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('title');
    expect(link).toHaveClass('bottom-24', 'md:bottom-6');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['/ko/cart', '/en/checkout', '/ko/products/teapot'])('clears the mobile purchase bar on %s', (route) => {
    pathname = route;
    render(<KakaoChatButton />);
    expect(screen.getByRole('link')).toHaveClass('bottom-40', 'lg:bottom-6');
    expect(screen.getByRole('link')).not.toHaveClass('md:bottom-6');
  });

  it('uses the lower position when mobile navigation is disabled', () => {
    pathname = '/ko';
    render(<MobileNavProvider initialVisible={false}><KakaoChatButton /></MobileNavProvider>);
    expect(screen.getByRole('link')).toHaveClass('bottom-6');
  });
});
