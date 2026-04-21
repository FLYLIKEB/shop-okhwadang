'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { inquiriesApi } from '@/lib/api'
import type { Inquiry, ProductDetailImage } from '@/lib/api'
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/components/ui/utils'
import ReviewsTab from '@/components/shared/reviews/ReviewsTab'

interface ProductTabsProps {
  description: string | null
  descriptionImages: ProductDetailImage[]
  productId?: number
  locale?: string
}

const TABS = ['details', 'reviews', 'inquiry'] as const
type Tab = (typeof TABS)[number]
const INQUIRY_TYPE_PRODUCT = '상품'

export default function ProductTabs({ description, descriptionImages, productId, locale = 'ko' }: ProductTabsProps) {
  const t = useTranslations('product')
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [sanitized, setSanitized] = useState('')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

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
      const response = await inquiriesApi.getList()
      const items = Array.isArray(response) ? response : response.data
      const filtered = items
        .filter((inquiry) => inquiry.type === INQUIRY_TYPE_PRODUCT)
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
      })
      setTitle('')
      setContent('')
      await loadInquiries(undefined)
    },
    { successMessage: t('tabs.inquiryPanel.submitSuccess'), errorMessage: t('tabs.inquiryPanel.submitError') },
  )

  useEffect(() => {
    import('dompurify').then((mod) => {
      setSanitized(mod.default.sanitize(description ?? '', {
        ALLOWED_TAGS: ['p','br','strong','em','ul','ol','li','h2','h3','h4','a','img'],
        ALLOWED_ATTR: ['href','src','alt','target','rel'],
      }))
    })
  }, [description])

  useEffect(() => {
    if (activeTab !== 'inquiry' || !isAuthenticated) return
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
    <div className="mt-8">
      <div className="flex justify-center md:justify-start border-b border-border sticky top-88 z-30 bg-background">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-3 typo-body-sm transition-colors',
              activeTab === tab
                ? 'border-b-2 border-foreground font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      <div className="py-6">
        {activeTab === 'details' && (
          <div className="flex flex-col gap-6">
            {descriptionImages.length > 0 && (
              <div className="flex flex-col gap-0">
                {descriptionImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative w-full overflow-hidden bg-muted"
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
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
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
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? t('tabs.inquiryPanel.submitting') : t('tabs.inquiryPanel.submit')}
                    </button>
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
                            <p className="text-sm font-medium text-foreground">{inquiry.title}</p>
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
