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
    <div className="inline-flex items-center w-fit border border-border bg-background">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="수량 감소"
        className={cn(
          'flex items-center justify-center h-9 w-9 shrink-0 border-r border-border transition-colors text-muted-foreground hover:bg-muted',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Minus className="size-3.5" strokeWidth={1.5} />
      </button>

      <span className="w-10 text-sm font-medium text-center text-foreground tabular-nums">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= maxQuantity}
        aria-label="수량 증가"
        className={cn(
          'flex items-center justify-center h-9 w-9 shrink-0 border-l border-border transition-colors text-muted-foreground hover:bg-muted',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
