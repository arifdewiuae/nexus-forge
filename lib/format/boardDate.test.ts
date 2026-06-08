import { describe, it, expect } from 'vitest'
import { formatBoardDate } from './boardDate'

describe('formatBoardDate', () => {
  it('formats as lowercased "weekday, mon day"', () => {
    // 2026-06-07 is a Sunday (UTC noon to avoid TZ rollover).
    const d = new Date('2026-06-07T12:00:00Z')
    expect(formatBoardDate(d)).toBe('sun, jun 7')
  })

  it('uses the numeric day without padding', () => {
    const d = new Date('2026-01-03T12:00:00Z')
    expect(formatBoardDate(d)).toMatch(/^sat, jan 3$/)
  })
})
