import styles from './SegmentBar.module.css'

/**
 * SegmentBar — renders WLED light strip segments as proportional color blocks.
 * Visually represents the current active colors/patterns across all WLED segments.
 *
 * Props:
 *   segments  - Array of { color: hex, start: int, stop: int }
 *   isOn      - Boolean indicating if device is powered on
 *   fallbackColor - Hex string used if segment colors are not yet populated
 */
export function SegmentBar({ segments = [], isOn = true, fallbackColor = '#8b5cf6' }) {
  const activeSegments = segments.length > 0
    ? segments
    : [{ color: fallbackColor, start: 0, stop: 100 }]

  if (!isOn) {
    return (
      <div className={[styles.bar, styles.barOff].join(' ')} aria-label="LED strip standby">
        {activeSegments.map((seg, i) => (
          <div
            key={i}
            className={styles.segmentOff}
            style={{ width: `${100 / activeSegments.length}%`, backgroundColor: seg.color || fallbackColor }}
          />
        ))}
      </div>
    )
  }

  if (activeSegments.length === 1) {
    const color = activeSegments[0].color || fallbackColor
    return (
      <div className={styles.bar} aria-label={`LED strip color: ${color}`}>
        <div
          className={styles.segmentSingle}
          style={{
            background: `linear-gradient(to right, ${color}cc, ${color})`,
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>
    )
  }

  const total = activeSegments.reduce((s, seg) => s + (seg.stop - seg.start || 1), 0) || 1

  return (
    <div className={styles.bar} role="img" aria-label="LED strip multi-segments">
      {activeSegments.map((seg, i) => {
        const width = ((seg.stop - seg.start || 1) / total) * 100
        const color = seg.color || fallbackColor
        return (
          <div
            key={i}
            className={styles.segment}
            style={{
              width: `${width}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}55`,
            }}
            title={`Segment ${i + 1}: ${color}`}
          />
        )
      })}
    </div>
  )
}
