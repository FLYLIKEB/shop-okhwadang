import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StarRating from '../StarRating'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === 'nStar' && values) return `${values.n}점`
    return key
  },
}))

describe('StarRating', () => {
  it('renders correct number of stars', () => {
    render(<StarRating rating={3} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('displays aria label with rating', () => {
    render(<StarRating rating={4} />)
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', '4점')
  })

  it('calls onChange when interactive and clicked', () => {
    const onChange = vi.fn()
    render(<StarRating rating={0} interactive onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2]) // 3rd star
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('does not call onChange when not interactive', () => {
    const onChange = vi.fn()
    render(<StarRating rating={3} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders with custom maxRating', () => {
    render(<StarRating rating={2} maxRating={10} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(10)
  })
})
