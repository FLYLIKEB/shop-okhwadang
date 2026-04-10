'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/components/ui/utils'
import ReviewsTab from '@/components/reviews/ReviewsTab'
import type { ProductDetailImage } from '@/lib/api'

interface ProductTabsProps {
  description: string | null
  descriptionImages: ProductDetailImage[]
  productId?: number
}

const TABS = ['상세정보', '리뷰', '문의'] as const
type Tab = (typeof TABS)[number]

export default function ProductTabs({ description, descriptionImages, productId }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('상세정보')
  const [sanitized, setSanitized] = useState('')

  useEffect(() => {
    import('dompurify').then((mod) => {
      setSanitized(mod.default.sanitize(description ?? ''))
    })
  }, [description])

  return (
    <div className="mt-8">
      <div className="flex justify-center md:justify-start border-b border-border sticky top-14 z-30 bg-background">
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
            {tab}
          </button>
        ))}
      </div>
      <div className="py-6">
        {activeTab === '상세정보' && (
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
                      alt={image.alt ?? `상세정보 이미지 ${index + 1}`}
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
        {activeTab === '리뷰' && productId && (
          <ReviewsTab productId={productId} />
        )}
        {activeTab === '리뷰' && !productId && (
          <p className="text-sm text-muted-foreground">준비 중입니다.</p>
        )}
        {activeTab === '문의' && (
          <p className="text-sm text-muted-foreground">준비 중입니다.</p>
        )}
      </div>
    </div>
  )
}