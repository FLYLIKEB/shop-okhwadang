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
    <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="수량 감소"
        className={cn(
          'flex items-center justify-center h-10 w-10 shrink-0 transition-colors',
          'text-foreground hover:bg-accent',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
        )}
      >
        <Minus className="size-4" strokeWidth={2} />
      </button>

      <span className="flex items-center justify-center h-10 w-10 text-sm font-medium border-x border-border shrink-0">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= maxQuantity}
        aria-label="수량 증가"
        className={cn(
          'flex items-center justify-center h-10 w-10 shrink-0 transition-colors',
          'text-foreground hover:bg-accent',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
        )}
      >
        <Plus className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
