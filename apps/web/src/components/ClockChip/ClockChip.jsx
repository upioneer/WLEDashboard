import { useEffect, useState } from 'react'
import { settingsApi, systemApi } from '../../lib/api.js'
import styles from './ClockChip.module.css'

export const TIME_CHIP_STYLES = [
  { value: 'full', label: 'Full (time, seconds, date)' },
  { value: 'compact', label: 'Compact (time, zone)' },
  { value: 'minimal', label: 'Minimal (time only)' },
]

export const TIME_ZONES = [
  'local',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Athens',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

function formatClock(date, timeZone, style) {
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

export function ClockChip() {
  const [enabled, setEnabled] = useState(true)
  const [style, setStyle] = useState('compact')
  const [timeZone, setTimeZone] = useState('local')
  const [deltaMs, setDeltaMs] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      try {
        const [s, t] = await Promise.all([settingsApi.get(), systemApi.getTime()])
        if (cancelled) return
        setEnabled(s.time_chip_enabled !== '0')
        setStyle(s.time_chip_style || 'compact')
        setTimeZone(s.time_zone || 'local')
        setDeltaMs(Date.parse(t.serverTime) - Date.now())
        setLoaded(true)
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    sync()
    const resync = setInterval(sync, 5 * 60 * 1000)
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => {
      cancelled = true
      clearInterval(resync)
      clearInterval(tick)
    }
  }, [])

  if (!loaded || !enabled) return null

  const serverNow = new Date(now.getTime() + deltaMs)
  const { primary, secondary } = formatClock(serverNow, timeZone, style)

  return (
    <div
      className={styles.chip}
      role="status"
      aria-label={`Server time ${primary}${secondary ? ` ${secondary}` : ''}`}
      title="Server time (automations reference)"
    >
      <span className={styles.primary}>{primary}</span>
      {secondary && <span className={styles.secondary}>{secondary}</span>}
    </div>
  )
}
