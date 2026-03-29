'use client'

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
    <div className="flex items-center gap-0 rounded-md border border-border">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="수량 감소"
        className="flex h-10 w-10 items-center justify-center rounded-l-md text-lg transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        -
      </button>
      <span className="flex h-10 w-12 items-center justify-center text-sm font-medium">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= maxQuantity}
        aria-label="수량 증가"
        className="flex h-10 w-10 items-center justify-center rounded-r-md text-lg transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        +
      </button>
    </div>
  )
}
