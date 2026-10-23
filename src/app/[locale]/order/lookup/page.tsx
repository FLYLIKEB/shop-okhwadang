'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ApiHttpError } from '@/lib/api-error';
import { SESSION_KEYS } from '@/constants/storage';
import { guestOrdersApi } from '@/lib/api';

export default function OrderLookupPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const t = useTranslations('orderLookup');

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await guestOrdersApi.lookup({
        orderNumber: orderNumber.trim(),
        email: email.trim(),
        locale: locale === 'en' ? 'en' : 'ko',
      });

      sessionStorage.setItem(
        SESSION_KEYS.GUEST_ORDER_CONTEXT,
        JSON.stringify({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          guestAccessToken: result.guestAccessToken,
          guestAccessTokenExpiresAt: result.guestAccessTokenExpiresAt,
        }),
      );
      toast.success(t('guestLookupSuccess'));
      router.replace(
        `/${locale}/order/complete?orderId=${result.order.id}&orderNumber=${result.order.orderNumber}&flow=guest`,
      );
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 404) {
          toast.error(t('guestLookupNotFound'));
        } else if (error.status === 400) {
          toast.error(t('guestLookupValidationError'));
        } else {
          toast.error(t('guestLookupError'));
        }
      } else {
        toast.error(t('guestLookupError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="editorial-content-page editorial-utility-page layout-container layout-page max-w-2xl">
      <div className="editorial-page-body">
        <p className="typo-label text-muted-foreground">{t('eyebrow')}</p>
        <h1 className="mt-2 typo-h1 font-normal">{t('title')}</h1>
        <p className="mt-3 typo-body-sm text-muted-foreground">{t('description')}</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="orderNumber" className="typo-body-sm text-foreground">
              {t('orderNumberLabel')}
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              type="text"
              autoComplete="off"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder={t('orderNumberPlaceholder')}
              className="mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-2 typo-body-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="typo-body-sm text-foreground">
              {t('emailLabel')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('emailPlaceholder')}
              className="mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-2 typo-body-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="editorial-link w-full justify-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>

        <div className="editorial-section mt-6 typo-body-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t('memberHintTitle')}</p>
          <p className="mt-1">{t('memberHintDescription')}</p>
          <Link href={`/${locale}/login`} className="editorial-link mt-3">
            {t('memberHintAction')}
          </Link>
        </div>
      </div>
    </div>
  );
}
