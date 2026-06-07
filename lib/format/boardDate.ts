/**
 * The handwritten board date, e.g. "sun, jun 7" — lowercased weekday + month + day.
 * Takes an explicit Date so it's deterministic and unit-testable.
 */
export function formatBoardDate(d: Date): string {
  const day = d.toLocaleDateString(undefined, { weekday: 'short' }).toLowerCase()
  const mon = d.toLocaleDateString(undefined, { month: 'short' }).toLowerCase()
  return `${day}, ${mon} ${d.getDate()}`
}
