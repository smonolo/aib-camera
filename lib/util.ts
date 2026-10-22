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
