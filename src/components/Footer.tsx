'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useNavigation } from '@/hooks/useNavigation';
import { cn } from '@/components/ui/utils';
import type { NavigationItem } from '@/lib/api';

interface FooterLink {
  id: number;
  label: string;
  url: string;
}

const FALLBACK_LINKS = {
  customerService: [
    { id: -1, label: '고객센터', url: '/pages/support' },
    { id: -2, label: '자주 묻는 질문', url: '/faq' },
    { id: -3, label: '배송 안내', url: '/pages/shipping' },
    { id: -4, label: '반품 및 교환', url: '/pages/returns' },
  ],
  company: [
    { id: -5, label: '이용약관', url: '/pages/terms' },
    { id: -6, label: '개인정보처리방침', url: '/pages/privacy' },
  ],
  shop: [
    { id: -7, label: '전체 상품', url: '/products' },
    { id: -8, label: '컬렉션', url: '/collection' },
    { id: -9, label: 'Archive', url: '/archive' },
    { id: -10, label: 'Journal', url: '/journal' },
  ],
};

function FooterLink({ item }: { item: FooterLink | NavigationItem }) {
  const url = (item as FooterLink).url;
  return (
    <Link
      href={url}
      className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
    >
      <span className="relative inline-block">
        {item.label}
        <span className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full bg-foreground/40 transition-all duration-500 ease-out" />
      </span>
    </Link>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail('');
  };

  if (submitted) {
    return (
      <div className="text-sm text-muted-foreground animate-in fade-in duration-300">
        구독해주셔서 감사합니다.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        className="flex-1 bg-transparent border-b border-foreground/20 focus:border-foreground py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-300"
      />
      <button
        type="submit"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-transparent hover:border-foreground pb-0.5"
      >
        등록
      </button>
    </form>
  );
}

function FooterSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="typo-label tracking-[0.15em] uppercase text-foreground/40">{title}</p>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <FooterLink key={link.id} item={link} />
        ))}
      </nav>
    </div>
  );
}

function MobileAccordion({
  title,
  links,
  defaultOpen = false,
}: {
  title: string;
  links: FooterLink[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="typo-body-sm font-medium text-foreground">{title}</span>
        <span
          className={cn(
            'text-muted-foreground text-xs transition-transform duration-300',
            open ? 'rotate-180' : '',
          )}
        >
          ▼
        </span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          open ? 'max-h-48 pb-4' : 'max-h-0',
        )}
      >
        <nav className="flex flex-col gap-2.5">
          {links.map((link) => (
            <FooterLink key={link.id} item={link} />
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function Footer() {
  const { items: footerItems } = useNavigation('footer');
  const hasCmsData = footerItems.length > 0;

  const rootItems = hasCmsData
    ? footerItems.filter((item) => item.parent_id === null)
    : [];

  const customerServiceLinks: FooterLink[] = hasCmsData
    ? (rootItems.slice(0, 4) as FooterLink[])
    : FALLBACK_LINKS.customerService;
  const companyLinks: FooterLink[] = hasCmsData
    ? (rootItems.slice(4, 6) as FooterLink[])
    : FALLBACK_LINKS.company;
  const shopLinks: FooterLink[] = hasCmsData
    ? (rootItems.slice(6, 10) as FooterLink[])
    : FALLBACK_LINKS.shop;

  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-16 py-16">
          <div className="flex gap-16">
            <div className="flex flex-col gap-6 shrink-0 w-48">
              <Image
                src="/logo-okhwadang.png"
                alt="옥화당"
                width={100}
                height={28}
                className="object-contain"
              />
              <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                <p>자사호 · 보이차 · 다구</p>
                <p>차의 온도를 전해드립니다</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-12">
              <FooterSection title="고객센터" links={customerServiceLinks} />
              <FooterSection title="쇼핑" links={shopLinks} />
              <FooterSection title="회사" links={companyLinks} />
            </div>

            <div className="shrink-0 w-52">
              <p className="typo-label tracking-[0.15em] uppercase text-foreground/40 mb-4">
               Newsletter
              </p>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                새로운 컬렉션과 이야기를 전해드립니다.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-16 py-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} 옥화당. All rights reserved.
            </p>
            <div className="flex gap-6">
              {[
                { label: '이용약관', url: '/pages/terms' },
                { label: '개인정보처리방침', url: '/pages/privacy' },
              ].map((item) => (
                <Link
                  key={item.url}
                  href={item.url}
                  className="text-xs text-muted-foreground/60 hover:text-foreground/80 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="px-6 pt-10 pb-6 text-center">
          <Image
            src="/logo-okhwadang.png"
            alt="옥화당"
            width={80}
            height={22}
            className="object-contain mx-auto mb-3"
          />
          <p className="text-xs text-muted-foreground">자사호 · 보이차 · 다구</p>
        </div>

        <div className="px-6">
          <MobileAccordion title="고객센터" links={customerServiceLinks} defaultOpen />
          <MobileAccordion title="쇼핑" links={shopLinks} />
          <MobileAccordion title="회사" links={companyLinks} />
          <MobileAccordion
            title="Newsletter"
            links={[{ id: -100, label: '', url: '' }]}
            defaultOpen
          />
        </div>

        <div className="px-6 pt-6 pb-8">
          <p className="text-xs text-muted-foreground/60 text-center">
            &copy; {new Date().getFullYear()} 옥화당. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
