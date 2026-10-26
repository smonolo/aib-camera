import { createSerialQueue, debounce, uniqueStrings } from '@/lib/util'

describe('uniqueStrings', () => {
  it('drops empties and duplicates', () => {
    expect(uniqueStrings(['a', '', null, 'b', 'a', undefined])).toEqual([
      'a',
      'b',
    ])
  })
})

describe('createSerialQueue', () => {
  it('runs tasks in order', async () => {
    const enqueue = createSerialQueue()
    const order: number[] = []

    await Promise.all([
      enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        order.push(1)
      }),
      enqueue(async () => {
        order.push(2)
      }),
    ])

    expect(order).toEqual([1, 2])
  })
})

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls once after wait with the latest args', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    jest.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('flush runs pending immediately', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced('x')
    debounced.flush()
    expect(fn).toHaveBeenCalledWith('x')
    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel drops pending work', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced('x')
    debounced.cancel()
    jest.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
    debounced.flush()
    expect(fn).not.toHaveBeenCalled()
  })
})
