import { errorMessage } from '@/lib/errors'

describe('errorMessage', () => {
  it('prefers Error.message when present', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('accepts non-empty strings', () => {
    expect(errorMessage(' nope ', 'fallback')).toBe(' nope ')
  })

  it('falls back for empty or unknown values', () => {
    expect(errorMessage(new Error('   '), 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage({ code: 1 }, 'fallback')).toBe('fallback')
  })
})
