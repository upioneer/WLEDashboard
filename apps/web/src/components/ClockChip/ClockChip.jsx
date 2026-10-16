import { useEffect, useState } from 'react'
import { settingsApi, systemApi } from '../../lib/api.js'
import { formatClock } from '../../lib/clock.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './ClockChip.module.css'

export const TIME_CHIP_STYLES = [
  { value: 'full', label: 'Full (time, seconds, date)' },
  { value: 'compact', label: 'Compact (time, zone)' },
  { value: 'minimal', label: 'Minimal (time only)' },
]

// 'local' stays pinned first as the default; the rest are alphabetical.
export const TIME_ZONES = [
  'local',
  'America/Anchorage',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
]

export function ClockChip({ hidden = false }) {
  const clockSettings = useUIStore(s => s.clockSettings)
  const setClockSettings = useUIStore(s => s.setClockSettings)
  const { enabled, style, timeZone } = clockSettings
  const [deltaMs, setDeltaMs] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      try {
        const [s, t] = await Promise.all([settingsApi.get(), systemApi.getTime()])
        if (cancelled) return
        setClockSettings({
          enabled: s.time_chip_enabled !== '0',
          style: s.time_chip_style || 'compact',
          timeZone: s.time_zone || 'local',
        })
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
  }, [setClockSettings])

  if (loaded && !enabled) return null

  // Invisible same-size chip keeps footer height stable while settings load
  // and while the sidebar is collapsed, so the icons never shift.
  if (!loaded || hidden) {
    return (
      <div className={styles.chip} aria-hidden="true" style={{ visibility: 'hidden' }}>
        <span className={styles.primary}>00:00:00</span>
      </div>
    )
  }

  const serverNow = new Date(now.getTime() + deltaMs)
  const { primary, secondary } = formatClock(serverNow, timeZone, style)

  return (
    <div
      className={`${styles.chip} ${styles.chipVisible}`}
      role="status"
      aria-label={`Server time ${primary}${secondary ? ` ${secondary}` : ''}`}
      title="Server time (automations reference)"
    >
      <span className={styles.primary}>{primary}</span>
      {secondary && <span className={styles.secondary}>{secondary}</span>}
    </div>
  )
}
