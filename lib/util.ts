export function uniqueStrings(
  values: Array<string | null | undefined>
): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export function createSerialQueue() {
  let chain: Promise<unknown> = Promise.resolve()

  return (task: () => Promise<void>): Promise<void> => {
    const run = chain.then(task, task)
    chain = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number
): ((...args: T) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: T | null = null

  const cancel = () => {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
    pending = null
  }

  const flush = () => {
    if (pending == null) {
      cancel()
      return
    }
    const args = pending
    pending = null
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
    fn(...args)
  }

  const wrapped = (...args: T) => {
    pending = args
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      timer = null
      const next = pending
      pending = null
      if (next) fn(...next)
    }, waitMs)
  }

  wrapped.cancel = cancel
  wrapped.flush = flush
  return wrapped
}
