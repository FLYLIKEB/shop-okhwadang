import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import OptionSelector from '@/components/shared/products/OptionSelector'
import type { ProductOption } from '@/lib/api'

const translations: Record<string, string> = {
  soldout: '품절',
  optionSoldoutReason: '해당 옵션은 품절되어 선택할 수 없습니다.',
  optionSoldoutAria: '{option} 옵션 품절',
  lowStock: '남은 수량 {count}개',
  available: '구매 가능',
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const template = translations[key] ?? key
    if (!values) return template
    return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), template)
  },
}))

const mockOptions: ProductOption[] = [
  { id: 1, name: '색상', value: '블랙', priceAdjustment: 0, stock: 10, sortOrder: 0 },
  { id: 2, name: '색상', value: '화이트', priceAdjustment: 0, stock: 0, sortOrder: 1 },
  { id: 3, name: '색상', value: '레드', priceAdjustment: 1000, stock: 5, sortOrder: 2 },
]

describe('OptionSelector', () => {
  it('calls onSelect with option id when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<OptionSelector options={mockOptions} selectedOptionId={null} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /블랙/ }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('disables button when stock is 0', () => {
    render(<OptionSelector options={mockOptions} selectedOptionId={null} onSelect={vi.fn()} />)
    const soldoutBtn = screen.getByRole('button', { name: /화이트/ })
    expect(soldoutBtn).toBeDisabled()
  })

  it('selected option has ring classes', () => {
    render(<OptionSelector options={mockOptions} selectedOptionId={1} onSelect={vi.fn()} />)
    const selectedBtn = screen.getByRole('button', { name: /블랙/ })
    expect(selectedBtn.className).toContain('ring-2')
    expect(selectedBtn.className).toContain('ring-foreground')
  })
})
