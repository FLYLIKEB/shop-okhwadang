'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { inquiriesApi } from '@/lib/api'
import type { Inquiry, ProductDetailImage, ProductNoticeInfo } from '@/lib/api'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/components/ui/utils'
import { Button } from '@/components/ui/button'
import ReviewsTab from '@/components/shared/reviews/ReviewsTab'
import { hasEmbeddedDetailMedia, sanitizeProductDetailHtml } from '@/lib/product-detail-html'

interface ProductTabsProps {
  description: string | null
  descriptionImages: ProductDetailImage[]
  productId?: number
  locale?: string
  noticeInfo?: ProductNoticeInfo | null
}

const TABS = ['details', 'reviews', 'inquiry'] as const
type Tab = (typeof TABS)[number]
const INQUIRY_TYPE_PRODUCT = '상품'

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
    <section className="toss-product-guide rounded-2xl bg-muted/40 p-4 md:p-5" aria-labelledby={titleId}>
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between rounded-xl px-1 py-1 text-left"
        aria-expanded={isOpen}
        aria-controls={`${titleId}-content`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <span className="typo-label block text-muted-foreground">{eyebrow}</span>
          <span id={titleId} className="mt-1 block typo-h3 font-body tracking-tight text-foreground">{title}</span>
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </Button>
      {isOpen && (
        <dl id={`${titleId}-content`} className="mt-4 divide-y divide-border/50 rounded-xl bg-background/70 px-4">
          {rows.map((row) => (
            <div key={row.key} className="grid gap-1 py-3 md:grid-cols-[11rem_1fr] md:gap-6">
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

export default function ProductTabs({ description, descriptionImages, productId, locale = 'ko', noticeInfo }: ProductTabsProps) {
  const t = useTranslations('product')
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [sanitized, setSanitized] = useState('')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSecret, setIsSecret] = useState(false)

  const tabLabels = useMemo(
    () => ({
      details: t('tabs.details'),
      reviews: t('tabs.reviews'),
      inquiry: t('tabs.inquiry'),
    }),
    [t],
  )

  const loginHref = useMemo(() => {
    if (!pathname) return '/login'
    return `/login?redirect=${encodeURIComponent(pathname)}`
  }, [pathname])

  const { execute: loadInquiries, isLoading: isLoadingInquiries } = useAsyncAction(
    async () => {
      const response = await inquiriesApi.getList(productId ? { productId } : undefined)
      const items = Array.isArray(response) ? response : response.data
      const filtered = items
        .filter((inquiry) => inquiry.type === INQUIRY_TYPE_PRODUCT && (!productId || inquiry.productId == null || inquiry.productId === productId))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      setInquiries(filtered)
    },
    { errorMessage: t('tabs.inquiryPanel.loadError') },
  )

  const { execute: submitInquiry, isLoading: isSubmitting } = useAsyncAction(
    async () => {
      const trimmedTitle = title.trim()
      const trimmedContent = content.trim()

      await inquiriesApi.create({
        type: INQUIRY_TYPE_PRODUCT,
        title: trimmedTitle,
        content: trimmedContent,
        productId,
        isSecret,
      })
      setTitle('')
      setContent('')
      setIsSecret(false)
      await loadInquiries(undefined)
    },
    { successMessage: t('tabs.inquiryPanel.submitSuccess'), errorMessage: t('tabs.inquiryPanel.submitError') },
  )

  useEffect(() => {
    import('dompurify').then((mod) => {
      const DOMPurify = mod.default ?? mod
      setSanitized(sanitizeProductDetailHtml(DOMPurify, description))
    })
  }, [description])

  const descriptionContainsEmbeddedMedia = hasEmbeddedDetailMedia(description)

  // 한 세션 동안 같은 (사용자, 탭 진입) 조건에서 중복 호출을 막는 가드.
  // GlobalLoadingContext / useAsyncAction 의 reference 안정화로도 방어되지만,
  // 향후 다른 외부 컨텍스트가 흔들릴 가능성에 대비한 다층 방어.
  const inquiriesLoadedRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated) {
      inquiriesLoadedRef.current = false
      return
    }
    if (activeTab !== 'inquiry') return
    if (inquiriesLoadedRef.current) return
    inquiriesLoadedRef.current = true
    void loadInquiries(undefined)
  }, [activeTab, isAuthenticated, loadInquiries])

  const handleInquirySubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('tabs.inquiryPanel.validation'))
      return
    }
    void submitInquiry(undefined)
  }

  return (
    <div className="mt-4">
      <div
        role="navigation"
        aria-label={t('tabs.navigationLabel')}
        className="sticky sticky-below-header z-30 flex w-full items-center justify-center gap-8 border-b border-border/50 bg-background/95 px-4 backdrop-blur"
      >
        {TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            aria-controls={`product-tabpanel-${tab}`}
            id={`product-tab-${tab}`}
            className={cn(
              'relative h-12 min-h-12 rounded-none px-1 py-2 typo-body-sm transition-colors hover:bg-transparent',
              activeTab === tab
                ? 'font-semibold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tabLabels[tab]}
          </Button>
        ))}
      </div>
      <div
        id={`product-tabpanel-${activeTab}`}
        role="region"
        aria-labelledby={`product-tab-${activeTab}`}
        tabIndex={0}
        className="py-6 outline-none"
      >
        {activeTab === 'details' && (
          <div className="flex flex-col gap-2 md:gap-6">
            {descriptionImages.length > 0 && !descriptionContainsEmbeddedMedia && (
              <div className="flex flex-col items-center gap-0">
                {descriptionImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative w-full max-w-4xl overflow-hidden bg-muted"
                    style={{ aspectRatio: '3/2' }}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt ?? t('tabs.detailsImageAlt', { index: index + 1 })}
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            )}
            <div
              className="product-detail-html max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
            <div className="mt-8 flex flex-col gap-3">
              <ProductNoticeInfoGuide noticeInfo={noticeInfo} />
              <ProductPolicyGuide namespace="deliveryGuide" titleId="delivery-guide-title" />
              <ProductPolicyGuide namespace="exchangeRefundGuide" titleId="exchange-refund-guide-title" />
            </div>
          </div>
        )}
        {activeTab === 'reviews' && productId && (
          <ReviewsTab productId={productId} />
        )}
        {activeTab === 'reviews' && !productId && (
          <p className="text-sm text-muted-foreground">{t('tabs.comingSoon')}</p>
        )}
        {activeTab === 'inquiry' && (
          <div className="space-y-5">
            {!isAuthenticated ? (
              <div className="rounded-lg border border-border bg-muted/30 p-5">
                <p className="text-base font-semibold text-foreground">{t('tabs.inquiryPanel.loginRequiredTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('tabs.inquiryPanel.loginRequiredDescription')}</p>
                <Link
                  href={loginHref}
                  className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  {t('tabs.inquiryPanel.loginAction')}
                </Link>
              </div>
            ) : (
              <>
                <form
                  className="space-y-3 rounded-lg border border-border bg-card p-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleInquirySubmit()
                  }}
                >
                  <div>
                    <label htmlFor="inquiry-title" className="mb-1 block text-sm font-medium text-foreground">
                      {t('tabs.inquiryPanel.titleLabel')}
                    </label>
                    <input
                      id="inquiry-title"
                      value={title}
                      maxLength={255}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('tabs.inquiryPanel.titlePlaceholder')}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="inquiry-content" className="mb-1 block text-sm font-medium text-foreground">
                      {t('tabs.inquiryPanel.contentLabel')}
                    </label>
                    <textarea
                      id="inquiry-content"
                      value={content}
                      rows={4}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t('tabs.inquiryPanel.contentPlaceholder')}
                      className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    {t('tabs.inquiryPanel.secretLabel')}
                  </label>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="black"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('tabs.inquiryPanel.submitting') : t('tabs.inquiryPanel.submit')}
                    </Button>
                  </div>
                </form>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">{t('tabs.inquiryPanel.listTitle')}</p>
                  {isLoadingInquiries ? (
                    <p className="text-sm text-muted-foreground">{t('tabs.inquiryPanel.loading')}</p>
                  ) : inquiries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('tabs.inquiryPanel.empty')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {inquiries.map((inquiry) => (
                        <li key={inquiry.id} className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{inquiry.isSecret ? `${t('tabs.inquiryPanel.secretBadge')} ` : ''}{inquiry.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(inquiry.createdAt).toLocaleDateString(locale)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{inquiry.content}</p>
                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {inquiry.status === 'answered'
                              ? t('tabs.inquiryPanel.statusAnswered')
                              : t('tabs.inquiryPanel.statusPending')}
                          </p>
                          {inquiry.answer && (
                            <div className="mt-2 rounded-md border border-border bg-card p-2">
                              <p className="text-xs font-semibold text-foreground">{t('tabs.inquiryPanel.answerLabel')}</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{inquiry.answer}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
