'use client';

import { usePathname } from 'next/navigation';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { cn } from '@/components/ui/utils';
import { localMessage } from '@/utils/localMessages';

export default function KakaoChatButton() {
  const pathname = usePathname();
  const { isVisible } = useMobileNav();
  const hasPurchaseBar = /\/(cart|checkout|products\/[^/]+)(\/|$)/.test(pathname ?? '');
  const label = localMessage('kakaoChat.label');

  return (
    <a
      id="kakaoChatBtn"
      href="https://pf.kakao.com/_xfxmxdIX/chat"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        'kakao-chat-button fixed right-6 z-40 flex h-14 w-14 items-center justify-center transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:bottom-6',
        hasPurchaseBar ? 'bottom-40' : isVisible ? 'bottom-24' : 'bottom-6',
      )}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.48 2 10.78c0 2.77 1.86 5.2 4.66 6.58l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.62.1 5.52 0 10-3.48 10-7.78S17.52 3 12 3z" />
      </svg>
    </a>
  );
}
