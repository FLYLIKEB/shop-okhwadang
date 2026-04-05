'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { NewsletterSignupContent } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface Props {
  content: NewsletterSignupContent;
}

export default function NewsletterSignupBlock({ content }: Props) {
  const {
    title,
    description,
    placeholder = '이메일을 입력하세요',
    button_text = '가입하기',
    template = 'default',
    background_image,
  } = content;

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section className={cn(
        'py-16 md:py-24 text-center bg-background',
        template === 'with_image' && background_image && 'relative'
      )}>
        {template === 'with_image' && background_image && (
          <div className="absolute inset-0 z-0">
            <Image src={background_image} alt="" fill className="object-cover opacity-10" />
          </div>
        )}
        <div className="relative z-10 max-w-xl mx-auto px-6">
          <p className="text-lg font-medium text-foreground">감사합니다.</p>
          <p className="mt-2 text-muted-foreground">소식を受け取る準備ができました。</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(
      'py-16 md:py-24',
      template === 'with_image' && background_image ? 'relative' : 'bg-background'
    )}>
      {template === 'with_image' && background_image && (
        <div className="absolute inset-0 z-0">
          <Image src={background_image} alt="" fill className="object-cover opacity-5" />
        </div>
      )}
      <div className={cn(
        'relative z-10 text-center',
        template === 'minimal' ? 'max-w-md mx-auto px-6' : 'max-w-xl mx-auto px-6'
      )}>
        <h2 className={cn(
          'font-medium text-foreground',
          template === 'minimal' ? 'typo-h2' : 'typo-h1 md:typo-display'
        )}>
          {title}
        </h2>
        {description && (
          <p className={cn(
            'mt-3 text-muted-foreground',
            template === 'minimal' ? 'text-sm' : 'text-base'
          )}>
            {description}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-8">
          <div className={cn(
            'flex gap-2',
            template === 'minimal' ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row justify-center'
          )}>
            <input
              type="email"
              id="newsletter-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className={cn(
                'flex-1 border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring',
                template === 'minimal' ? 'rounded-none' : ''
              )}
            />
            <button
              type="submit"
              className={cn(
                'bg-foreground text-background font-medium px-6 py-3 text-sm transition-colors hover:bg-foreground/90',
                template === 'minimal' ? 'rounded-none' : ''
              )}
            >
              {button_text}
            </button>
          </div>
        </form>
        {status === 'error' && (
          <p className="mt-4 text-sm text-destructive">오류가 발생했습니다. 다시 시도해주세요.</p>
        )}
      </div>
    </section>
  );
}
