/**
 * Sidebar clock formatting. Pure helpers shared by the ClockChip; kept
 * separate from the component so the style pipeline stays unit-testable.
 */

export function formatClock(date, timeZone, style) {
  const zone = timeZone === 'local' ? undefined : timeZone
  try {
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      ...(style === 'full' ? { second: '2-digit' } : {}),
      hour12: false,
      ...(zone ? { timeZone: zone } : {}),
    }).format(date)
    if (style === 'minimal') return { primary: time, secondary: null }
    if (style === 'compact') {
      const abbr = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
        ...(zone ? { timeZone: zone } : {}),
      }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? ''
      return { primary: time, secondary: abbr }
    }
    const day = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(zone ? { timeZone: zone } : {}),
    }).format(date)
    return { primary: time, secondary: day }
  } catch {
    return { primary: '--:--', secondary: null }
  }
}
