/**
 * Unified Formatting Utilities
 * Standardizes time and text layouts across FQuiz platform.
 */

/**
 * Formats study duration from raw minutes to user-friendly string.
 * @param minutes Duration in minutes
 * @param short Whether to format in short abbreviation (e.g. '1h 30m') or long form (e.g. '1 hour 30 mins')
 */
export function formatStudyDuration(minutes: number, short = false): string {
  if (minutes < 60) {
    return short ? `${minutes}m` : `${minutes} mins`
  }
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (short) {
    return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
  }
  const hourLabel = hours === 1 ? '1 hour' : `${hours} hours`
  return rem === 0 ? hourLabel : `${hourLabel} ${rem} mins`
}

/**
 * Escapes special regex characters in a string.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

