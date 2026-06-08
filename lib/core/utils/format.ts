/**
 * Unified Formatting Utilities
 * Standardizes time and text layouts across FQuiz platform.
 */

/**
 * Formats study duration from raw minutes to user-friendly string.
 * @param minutes Duration in minutes
 * @param short Whether to format in short English abbreviation (e.g. '1h 30m') or long Vietnamese form (e.g. '1 giờ 30 phút')
 */
export function formatStudyDuration(minutes: number, short = false): string {
  if (minutes < 60) {
    return short ? `${minutes}m` : `${minutes} phút`
  }
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (short) {
    return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
  }
  return rem === 0 ? `${hours} giờ` : `${hours} giờ ${rem} phút`
}
