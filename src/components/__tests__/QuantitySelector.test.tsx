import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import QuantitySelector from '@/components/shared/products/QuantitySelector'

describe('QuantitySelector', () => {
  it('does not call onDecrease when quantity is 1', async () => {
    const user = userEvent.setup()
    const onDecrease = vi.fn()
    render(
      <QuantitySelector quantity={1} maxQuantity={10} onIncrease={vi.fn()} onDecrease={onDecrease} />,
    )
    const decreaseBtn = screen.getByRole('button', { name: '수량 감소' })
    expect(decreaseBtn).toBeDisabled()
    await user.click(decreaseBtn)
    expect(onDecrease).not.toHaveBeenCalled()
  })

  it('calls onIncrease when + button clicked', async () => {
    const user = userEvent.setup()
    const onIncrease = vi.fn()
    render(
      <QuantitySelector quantity={1} maxQuantity={10} onIncrease={onIncrease} onDecrease={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: '수량 증가' }))
    expect(onIncrease).toHaveBeenCalledTimes(1)
  })

  it('disables + button when quantity equals maxQuantity', () => {
    render(
      <QuantitySelector quantity={10} maxQuantity={10} onIncrease={vi.fn()} onDecrease={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: '수량 증가' })).toBeDisabled()
  })
})
