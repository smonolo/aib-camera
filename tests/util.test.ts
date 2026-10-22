import { createSerialQueue, uniqueStrings } from '@/lib/util'

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
