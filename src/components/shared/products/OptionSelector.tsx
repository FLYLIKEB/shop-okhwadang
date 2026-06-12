'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/components/ui/utils'
import type { ProductOption } from '@/lib/api'
import { formatCurrency } from '@/utils/currency'

interface OptionSelectorProps {
  options: ProductOption[]
  selectedOptionId: number | null
  onSelect: (id: number) => void
}

export default function OptionSelector({ options, selectedOptionId, onSelect }: OptionSelectorProps) {
  const t = useTranslations('product.stockStatus')
  const groups = options.reduce<Record<string, ProductOption[]>>((acc, option) => {
    if (!acc[option.name]) {
      acc[option.name] = []
    }
    acc[option.name].push(option)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([groupName, groupOptions]) => (
        <div key={groupName} className="flex flex-col gap-2">
          <span className="typo-label text-foreground">{groupName}</span>
          <div className="flex flex-wrap gap-2">
            {groupOptions.map((option) => {
              const isSoldout = option.stock === 0
              const isSelected = option.id === selectedOptionId
              const isLowStock = !isSoldout && option.stock > 0 && option.stock <= 5
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSoldout}
                  aria-disabled={isSoldout}
                  aria-label={isSoldout ? t('optionSoldoutAria', { option: option.value }) : undefined}
                  title={isSoldout ? t('optionSoldoutReason') : isLowStock ? t('lowStock', { count: option.stock }) : undefined}
                  onClick={() => onSelect(option.id)}
                  className={cn(
                    'flex min-w-28 flex-col items-start gap-1 rounded-md border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected
                      ? 'ring-2 ring-foreground bg-foreground text-background border-foreground'
                      : 'border-border bg-background hover:border-foreground',
                    isSoldout && 'opacity-55 cursor-not-allowed',
                  )}
                >
                  <span className={cn('font-medium', isSoldout && 'line-through')}>{option.value}</span>
                  {option.priceAdjustment !== 0 && (
                    <span className="text-xs">
                      ({option.priceAdjustment > 0 ? '+' : ''}
                      {formatCurrency(option.priceAdjustment)})
                    </span>
                  )}
                  <span className={cn('text-xs', isSelected ? 'text-background/80' : 'text-muted-foreground', isSoldout && 'text-destructive')}>
                    {isSoldout ? t('soldout') : isLowStock ? t('lowStock', { count: option.stock }) : t('available')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
