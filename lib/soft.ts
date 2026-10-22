export function warn(label: string, error?: unknown): void {
  if (error === undefined) console.warn(label)
  else console.warn(label, error)
}

export async function softTry<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    warn(label, error)
    return fallback
  }
}

export async function softVoid(
  label: string,
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    await fn()
  } catch (error) {
    warn(label, error)
  }
}

export function logRejected(
  label: string,
  results: PromiseSettledResult<unknown>[]
): void {
  for (const result of results) {
    if (result.status === 'rejected') warn(label, result.reason)
  }
}
