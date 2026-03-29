'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/components/ui/utils'
import ReviewsTab from '@/components/reviews/ReviewsTab'

interface ProductTabsProps {
  description: string | null
  productId?: number
}

const TABS = ['상세정보', '리뷰', '문의'] as const
type Tab = (typeof TABS)[number]

export default function ProductTabs({ description, productId }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('상세정보')
  const [sanitized, setSanitized] = useState('')
  useEffect(() => {
    import('dompurify').then((mod) => {
      setSanitized(mod.default.sanitize(description ?? ''))
    })
  }, [description])

  return (
    <div className="mt-8">
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-3 text-sm transition-colors',
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
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
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
