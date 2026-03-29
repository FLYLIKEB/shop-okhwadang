import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ReviewStats from '../ReviewStats'

describe('ReviewStats', () => {
  const mockStats = {
    averageRating: 4.3,
    totalCount: 128,
    distribution: { '5': 80, '4': 30, '3': 10, '2': 5, '1': 3 },
  }

  it('renders average rating', () => {
    render(<ReviewStats stats={mockStats} />)
    expect(screen.getByText('4.3')).toBeInTheDocument()
  })

  it('renders total count', () => {
    render(<ReviewStats stats={mockStats} />)
    expect(screen.getByText('128개 리뷰')).toBeInTheDocument()
  })

  it('renders distribution bars for each star level', () => {
    render(<ReviewStats stats={mockStats} />)
    expect(screen.getByText('5점')).toBeInTheDocument()
    expect(screen.getByText('4점')).toBeInTheDocument()
    expect(screen.getByText('3점')).toBeInTheDocument()
    expect(screen.getByText('2점')).toBeInTheDocument()
    expect(screen.getByText('1점')).toBeInTheDocument()
  })

  it('renders distribution counts', () => {
    render(<ReviewStats stats={mockStats} />)
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('handles zero reviews', () => {
    const emptyStats = {
      averageRating: 0,
      totalCount: 0,
      distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    }
    render(<ReviewStats stats={emptyStats} />)
    expect(screen.getByText('0.0')).toBeInTheDocument()
    expect(screen.getByText('0개 리뷰')).toBeInTheDocument()
  })
})
