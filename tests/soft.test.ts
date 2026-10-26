import { logRejected, softTry, softVoid, warn } from '@/lib/soft'

describe('warn', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs a label alone', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    warn('hello')
    expect(spy).toHaveBeenCalledWith('hello')
  })

  it('logs a label with an error', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const error = new Error('boom')
    warn('hello', error)
    expect(spy).toHaveBeenCalledWith('hello', error)
  })
})

describe('softTry', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the function result on success', async () => {
    await expect(softTry('label', async () => 42, 0)).resolves.toBe(42)
  })

  it('returns the fallback and warns on failure', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const error = new Error('boom')
    await expect(
      softTry(
        'label',
        async () => {
          throw error
        },
        'fallback'
      )
    ).resolves.toBe('fallback')
    expect(spy).toHaveBeenCalledWith('label', error)
  })
})

describe('softVoid', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves when the function succeeds', async () => {
    const fn = jest.fn(async () => 'ok')
    await expect(softVoid('label', fn)).resolves.toBeUndefined()
    expect(fn).toHaveBeenCalled()
  })

  it('swallows errors and warns', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const error = new Error('boom')
    await expect(
      softVoid('label', async () => {
        throw error
      })
    ).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalledWith('label', error)
  })
})

describe('logRejected', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('warns only for rejected settled results', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const reason = new Error('nope')
    logRejected('batch', [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason },
      { status: 'fulfilled', value: 2 },
    ])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('batch', reason)
  })
})
