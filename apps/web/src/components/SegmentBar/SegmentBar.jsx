import styles from './SegmentBar.module.css'

/**
 * SegmentBar — renders WLED segments as proportional color blocks.
 * With a single segment, shows a gradient.
 * With multiple segments, shows distinct blocks.
 */
export function SegmentBar({ segments = [] }) {
  if (!segments.length) {
    return (
      <div className={styles.bar} style={{ background: 'var(--surface-overlay)' }} aria-hidden />
    )
  }

  if (segments.length === 1) {
    const color = segments[0].color ?? '#1a1a2e'
    return (
      <div
        className={styles.bar}
        style={{ background: `linear-gradient(to right, ${color}cc, ${color})` }}
        aria-label={`Segment color: ${color}`}
      />
    )
  }

  const total = segments.reduce((s, seg) => s + (seg.stop - seg.start || 1), 0) || 1

  return (
    <div className={styles.bar} role="img" aria-label="LED segments">
      {segments.map((seg, i) => {
        const width = ((seg.stop - seg.start || 1) / total) * 100
        return (
          <div
            key={i}
            className={styles.segment}
            style={{ width: `${width}%`, background: seg.color ?? 'var(--surface-overlay)' }}
            title={`Segment ${i + 1}: ${seg.color}`}
          />
        )
      })}
    </div>
  )
}
