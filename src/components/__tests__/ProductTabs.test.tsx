import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ProductTabs from '@/components/shared/products/ProductTabs'

vi.mock('isomorphic-dompurify', () => ({
  default: { sanitize: (html: string) => html },
}))

describe('ProductTabs', () => {
  it('default tab shows description content', () => {
    render(<ProductTabs description="<p>상품 상세 내용입니다.</p>" descriptionImages={[]} />)
    expect(screen.getByText('상세정보')).toBeInTheDocument()
    const detailContent = document.querySelector('.prose')
    expect(detailContent).toBeInTheDocument()
  })

  it('clicking 리뷰 tab shows 준비 중입니다', async () => {
    const user = userEvent.setup()
    render(<ProductTabs description={null} descriptionImages={[]} />)
    await user.click(screen.getByRole('button', { name: '리뷰' }))
    expect(screen.getByText('준비 중입니다.')).toBeInTheDocument()
  })

  it('clicking 문의 tab shows 준비 중입니다', async () => {
    const user = userEvent.setup()
    render(<ProductTabs description={null} descriptionImages={[]} />)
    await user.click(screen.getByRole('button', { name: '문의' }))
    expect(screen.getByText('준비 중입니다.')).toBeInTheDocument()
  })
})
