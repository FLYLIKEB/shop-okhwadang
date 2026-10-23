'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { popupsApi, type Popup } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { getStorageItem, setStorageItem } from '@/utils/storage';
import { Link } from '@/i18n/navigation';

function PopupDialog({ popup, onClose }: { popup: Popup; onClose: (hideToday: boolean) => void }) {
  const t = useTranslations('popups');
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    contentRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <Modal isOpen onClose={() => onClose(false)} ariaLabelledBy={titleId} showCloseButton={false} overlayClassName="p-4" className="max-h-full overflow-y-auto">
      <div
        ref={contentRef}
        className="space-y-4"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = contentRef.current?.querySelectorAll<HTMLElement>('a[href], button');
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <h2 id={titleId} className="typo-h3 font-display break-words">{popup.title}</h2>
        <Image src={popup.imageUrl} alt={popup.title} width={640} height={640} unoptimized className="h-auto w-full rounded-md" />
        {popup.linkUrl && (
          <Button asChild className="w-full min-h-11">
            <Link href={popup.linkUrl} prefetch={false} onClick={() => onClose(false)}>{t('viewLink')}</Link>
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11 flex-1" onClick={() => onClose(true)}>{t('hideToday')}</Button>
          <Button variant="ghost" className="min-h-11 flex-1" onClick={() => onClose(false)}>{t('close')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function StorefrontPopups() {
  const t = useTranslations('popups');
  const [popups, setPopups] = useState<Popup[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const { execute } = useAsyncAction(() => popupsApi.getList(), { errorMessage: t('fetchError') });

  useEffect(() => {
    let cancelled = false;
    void execute().then((items) => {
      if (cancelled || !items) return;
      const today = new Date().toDateString();
      setPopups(items.filter((popup) => getStorageItem<string>(`popup-hidden-${popup.id}`, '') !== today));
    });
    return () => { cancelled = true; };
  }, [execute]);

  const popup = popups.find((item) => !dismissed.includes(item.id));
  if (!popup) return null;

  return (
    <PopupDialog
      key={popup.id}
      popup={popup}
      onClose={(hideToday) => {
        if (hideToday) setStorageItem(`popup-hidden-${popup.id}`, new Date().toDateString());
        setDismissed((previous) => [...previous, popup.id]);
      }}
    />
  );
}
