'use client'

import { Minus, Plus } from 'lucide-react'
import { localMessage } from '@/utils/localMessages'
import { cn } from '@/components/ui/utils'
import { Button } from '@/components/ui/button'

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
    <div className="toss-quantity inline-flex w-fit items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label={localMessage('product.quantityDecrease')}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Minus className="size-3.5" strokeWidth={1.5} />
      </Button>

      <span className="w-10 text-sm font-medium text-center text-foreground tabular-nums">
        {quantity}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onIncrease}
        disabled={quantity >= maxQuantity}
        aria-label={localMessage('product.quantityIncrease')}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        )}
      >
        <Plus className="size-3.5" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
