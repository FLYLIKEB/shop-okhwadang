'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import type { ProductDetailImage, ProductNoticeInfo } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/utils'
import { hasEmbeddedDetailMedia, sanitizeProductDetailHtml } from '@/lib/product-detail-html'

const TEA_NOTICE_FIELDS: Array<keyof Omit<ProductNoticeInfo, 'type'>> = [
  'foodType',
  'producer',
  'origin',
  'manufactureDate',
  'expirationDate',
  'storageMethod',
  'ingredients',
  'customerServicePhone',
]

const TEAWARE_NOTICE_FIELDS: Array<keyof Omit<ProductNoticeInfo, 'type'>> = [
  'productName',
  'material',
  'components',
  'sizeCapacity',
  'manufacturer',
  'countryOfOrigin',
  'handlingPrecautions',
  'warrantyPolicy',
  'asContact',
]

type GuideRow<Key extends string> = {
  key: Key
  label: string
  value: string
}

function ProductGuideDisclosure<Key extends string>({
  eyebrow,
  title,
  titleId,
  rows,
}: {
  eyebrow: string
  title: string
  titleId: string
  rows: Array<GuideRow<Key>>
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (rows.length === 0) return null

  return (
    <section className="toss-product-guide border-t border-soft py-3" aria-labelledby={titleId}>
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-11 w-full justify-between rounded-none px-0 py-1 text-left hover:bg-transparent"
        aria-expanded={isOpen}
        aria-controls={`${titleId}-content`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <span className="typo-label block text-muted-foreground">{eyebrow}</span>
          <span id={titleId} className="mt-1 block typo-body-sm font-body text-foreground">{title}</span>
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </Button>
      {isOpen && (
        <dl id={`${titleId}-content`} className="mt-2 divide-y divide-soft">
          {rows.map((row) => (
            <div key={row.key} className="grid gap-1 py-3">
              <dt className="typo-body-sm font-semibold text-muted-foreground">{row.label}</dt>
              <dd className="typo-body-sm whitespace-pre-line font-normal text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function ProductNoticeInfoGuide({ noticeInfo }: { noticeInfo?: ProductNoticeInfo | null }) {
  const t = useTranslations('product.tabs.noticeInfo')

  if (!noticeInfo) return null

  const keys = noticeInfo.type === 'tea' ? TEA_NOTICE_FIELDS : TEAWARE_NOTICE_FIELDS
  const rows = keys
    .map((key) => ({ key, label: t(`labels.${key}`), value: noticeInfo[key] }))
    .filter((row): row is { key: keyof Omit<ProductNoticeInfo, 'type'>; label: string; value: string } => typeof row.value === 'string' && row.value.trim().length > 0)

  return (
    <ProductGuideDisclosure
      eyebrow={t('eyebrow')}
      title={t('title')}
      titleId="product-notice-info-title"
      rows={rows}
    />
  )
}

function ProductPolicyGuide({ namespace, titleId }: { namespace: 'deliveryGuide' | 'exchangeRefundGuide'; titleId: string }) {
  const t = useTranslations(`product.tabs.${namespace}`)
  const items = namespace === 'deliveryGuide'
    ? ['method', 'area', 'period', 'dispatch', 'remoteArea'] as const
    : ['changeOfMindPeriod', 'sellerFault', 'customerFault', 'refundTiming', 'foodRestriction'] as const
  const rows = items.map((item) => ({ key: item, label: t(`${item}.label`), value: t(`${item}.value`) }))

  return (
    <ProductGuideDisclosure
      eyebrow={t('eyebrow')}
      title={t('title')}
      titleId={titleId}
      rows={rows}
    />
  )
}

export function ProductGuides({ noticeInfo }: { noticeInfo?: ProductNoticeInfo | null }) {
  return (
    <div className="flex flex-col">
      <ProductNoticeInfoGuide noticeInfo={noticeInfo} />
      <ProductPolicyGuide namespace="deliveryGuide" titleId="delivery-guide-title" />
      <ProductPolicyGuide namespace="exchangeRefundGuide" titleId="exchange-refund-guide-title" />
    </div>
  )
}

export function ProductDescription({ description, descriptionImages }: {
  description: string | null
  descriptionImages: ProductDetailImage[]
}) {
  const t = useTranslations('product')
  const [sanitized, setSanitized] = useState('')

  useEffect(() => {
    import('dompurify').then((mod) => {
      const DOMPurify = mod.default ?? mod
      setSanitized(sanitizeProductDetailHtml(DOMPurify, description))
    })
  }, [description])

  const descriptionContainsEmbeddedMedia = hasEmbeddedDetailMedia(description)

  return (
    <div className="flex min-w-0 flex-col gap-2 md:gap-6">
      {descriptionImages.length > 0 && !descriptionContainsEmbeddedMedia && (
        <div className="flex flex-col items-center gap-0">
          {descriptionImages.map((image, index) => (
            <Image
              key={image.id}
              src={image.url}
              alt={image.alt ?? t('tabs.detailsImageAlt', { index: index + 1 })}
              width={1200}
              height={1200}
              sizes="(max-width: 768px) 100vw, 600px"
              className="h-auto w-full"
              priority={index === 0}
            />
          ))}
        </div>
      )}
      <div
        className="product-detail-html max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  )
}
