import crypto from 'crypto'

/** Fisher-Yates shuffle using a cryptographically secure RNG. */
export function secureShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    /* eslint-disable security/detect-object-injection */
    const j = crypto.randomInt(0, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    /* eslint-enable security/detect-object-injection */
  }
  return shuffled
}
