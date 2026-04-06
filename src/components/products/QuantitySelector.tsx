'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface QuantitySelectorProps {
  quantity: number
  maxQuantity: number
  onIncrease: () => void
  onDecrease: () => void
}

export default function QuantitySelector({
  quantity,
  maxQuantity,
  onIncrease,
  onDecrease,
}: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="수량 감소"
        className={cn(
          'relative h-9 w-9 p-1.5 transition-colors text-foreground hover:bg-muted rounded-full',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Minus className="absolute inset-0 m-auto size-4" strokeWidth={2} />
      </button>

      <span className="min-w-[2.5rem] px-1.5 text-sm font-medium text-center text-foreground tabular-nums">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= maxQuantity}
        aria-label="수량 증가"
        className={cn(
          'relative h-9 w-9 p-1.5 transition-colors text-foreground hover:bg-muted rounded-full',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Plus className="absolute inset-0 m-auto size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
