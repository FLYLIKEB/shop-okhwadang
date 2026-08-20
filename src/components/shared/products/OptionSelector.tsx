'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/components/ui/utils'
import type { ProductOption } from '@/lib/api'
import { formatCurrency } from '@/utils/currency'
import { getClientLocale } from '@/utils/clientLocale'
import { Button } from '@/components/ui/button'

interface OptionSelectorProps {
  options: ProductOption[]
  selectedOptionId: number | null
  onSelect: (id: number) => void
}

export default function OptionSelector({ options, selectedOptionId, onSelect }: OptionSelectorProps) {
  const t = useTranslations('product.stockStatus')
  const locale = getClientLocale()
  const groups = options.reduce<Record<string, ProductOption[]>>((acc, option) => {
    if (!acc[option.name]) {
      acc[option.name] = []
    }
    acc[option.name].push(option)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(groups).map(([groupName, groupOptions]) => (
        <div key={groupName} className="flex flex-col gap-1.5">
          <span className="typo-body-sm font-semibold text-foreground">{groupName}</span>
          <div className="flex flex-wrap gap-1.5">
            {groupOptions.map((option) => {
              const isSoldout = option.stock === 0
              const isSelected = option.id === selectedOptionId
              return (
                <Button
                  key={option.id}
                  type="button"
                  variant={isSelected ? 'black' : 'gray'}
                  size="sm"
                  disabled={isSoldout}
                  aria-disabled={isSoldout}
                  aria-label={isSoldout ? t('optionSoldoutAria', { option: option.value }) : undefined}
                  title={isSoldout ? t('optionSoldoutReason') : undefined}
                  onClick={() => onSelect(option.id)}
                  className={cn(
                    'h-auto min-h-16 min-w-24 flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-sm leading-snug transition-all whitespace-normal',
                    isSelected && 'ring-2 ring-foreground',
                    isSoldout && 'opacity-55 cursor-not-allowed',
                  )}
                >
                  <span className={cn('font-medium', isSoldout && 'line-through')}>{option.value}</span>
                  {option.priceAdjustment !== 0 && (
                    <span className="text-xs">
                      ({option.priceAdjustment > 0 ? '+' : ''}
                      {formatCurrency(option.priceAdjustment, locale)})
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
