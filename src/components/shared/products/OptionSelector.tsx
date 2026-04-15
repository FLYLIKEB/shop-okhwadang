'use client'

import { cn } from '@/components/ui/utils'
import type { ProductOption } from '@/lib/api'
import { formatCurrency } from '@/utils/currency'

interface OptionSelectorProps {
  options: ProductOption[]
  selectedOptionId: number | null
  onSelect: (id: number) => void
}

export default function OptionSelector({ options, selectedOptionId, onSelect }: OptionSelectorProps) {
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
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSoldout}
                  aria-disabled={isSoldout}
                  onClick={() => onSelect(option.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-all',
                    isSelected
                      ? 'ring-2 ring-foreground bg-foreground text-background border-foreground'
                      : 'border-border bg-background hover:border-foreground',
                    isSoldout && 'line-through opacity-50 cursor-not-allowed',
                  )}
                >
                  {option.value}
                  {option.priceAdjustment !== 0 && (
                    <span className="ml-1 text-xs">
                      ({option.priceAdjustment > 0 ? '+' : ''}
                      {formatCurrency(option.priceAdjustment)})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
