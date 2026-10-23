'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { inquiriesApi } from '@/lib/api'
import type { Inquiry, ProductDetailImage, ProductNoticeInfo } from '@/lib/api'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/components/ui/utils'
import { Button } from '@/components/ui/button'
import ReviewsTab from '@/components/shared/reviews/ReviewsTab'
import { ProductDescription, ProductGuides } from './ProductDetailContent'
import { formatDate } from '@/utils/date';

interface ProductTabsProps {
  layout?: 'tabs' | 'sections'
  description: string | null
  descriptionImages: ProductDetailImage[]
  productId?: number
  locale?: string
  noticeInfo?: ProductNoticeInfo | null
}

const TABS = ['details', 'reviews', 'inquiry'] as const
type Tab = (typeof TABS)[number]
const INQUIRY_TYPE_PRODUCT = '상품'

export default function ProductTabs({ description, descriptionImages, productId, locale = 'ko', noticeInfo, layout = 'tabs' }: ProductTabsProps) {
  const t = useTranslations('product')
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const isSections = layout === 'sections'
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


  // 한 세션 동안 같은 (사용자, 탭 진입) 조건에서 중복 호출을 막는 가드.
  // GlobalLoadingContext / useAsyncAction 의 reference 안정화로도 방어되지만,
  // 향후 다른 외부 컨텍스트가 흔들릴 가능성에 대비한 다층 방어.
  const inquiriesLoadedRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated) {
      inquiriesLoadedRef.current = false
      return
    }
    if (!isSections && activeTab !== 'inquiry') return
    if (inquiriesLoadedRef.current) return
    inquiriesLoadedRef.current = true
    void loadInquiries(undefined)
  }, [activeTab, isSections, isAuthenticated, loadInquiries])

  const handleInquirySubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('tabs.inquiryPanel.validation'))
      return
    }
    void submitInquiry(undefined)
  }

  return (
    <div className={isSections ? 'product-detail-community' : 'mt-4'}>
      {!isSections && <div
        role="navigation"
        aria-label={t('tabs.navigationLabel')}
        className="sticky sticky-below-header z-30 flex w-full items-center justify-between gap-0 border-b border-soft bg-background/95 px-0 backdrop-blur md:justify-center md:gap-8 md:px-4"
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
              'relative h-12 min-h-12 flex-1 rounded-none px-1 py-2 typo-body-sm transition-colors hover:bg-transparent md:flex-none md:px-4',
              activeTab === tab
                ? 'font-semibold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tabLabels[tab]}
          </Button>
        ))}
      </div>}
      <div
        id={isSections ? undefined : `product-tabpanel-${activeTab}`}
        role="region"
        aria-labelledby={isSections ? undefined : `product-tab-${activeTab}`}
        tabIndex={0}
        className="py-6 outline-none"
      >
        {!isSections && activeTab === 'details' && (
          <div className="flex flex-col gap-6">
            <ProductDescription description={description} descriptionImages={descriptionImages} />
            <ProductGuides noticeInfo={noticeInfo} />
          </div>
        )}
        {(isSections || activeTab === 'reviews') && (
          <section id={isSections ? 'product-tabpanel-reviews' : undefined} aria-label={tabLabels.reviews} className={isSections ? 'product-detail-community__section' : undefined}>
            {isSections && <h2 className="mb-6 typo-body-sm font-medium">{tabLabels.reviews}</h2>}
            {productId ? <ReviewsTab productId={productId} /> : <p className="text-sm text-muted-foreground">{t('tabs.comingSoon')}</p>}
          </section>
        )}
        {(isSections || activeTab === 'inquiry') && (
          <section id={isSections ? 'product-tabpanel-inquiry' : undefined} aria-label={tabLabels.inquiry} className={cn('space-y-5', isSections && 'product-detail-community__section')}>
            {isSections && <h2 className="typo-body-sm font-medium">{tabLabels.inquiry}</h2>}
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
                              {formatDate(inquiry.createdAt, locale)}
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
          </section>
        )}
      </div>
    </div>
  )
}
