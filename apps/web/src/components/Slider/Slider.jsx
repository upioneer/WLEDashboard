import { useCallback, useRef } from 'react'
import styles from './Slider.module.css'

/**
 * Brightness/value slider.
 * The track fill and glow react to the current value.
 * On release, the parent commits the value to the API (with debounce).
 *
 * Props:
 *   value       - 0-100 (percentage)
 *   onChange    - called on every change (debounced by parent)
 *   onCommit    - called on pointerup (send to API)
 *   color       - hex color for the fill glow
 *   min/max     - defaults 0/100
 */
export function Slider({
  value = 0,
  onChange,
  onCommit,
  color = null,
  min = 0,
  max = 100,
  step = 1,
  label,
  id,
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100)

  const trackStyle = {
    background: color
      ? `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, var(--surface-overlay) ${pct}%)`
      : `linear-gradient(to right, var(--accent-amber) 0%, var(--accent-amber) ${pct}%, var(--surface-overlay) ${pct}%)`,
  }

  const thumbGlow = color && pct > 0
    ? { boxShadow: `0 0 ${6 + pct * 0.12}px 2px ${color}66` }
    : {}

  const handleChange = useCallback((e) => {
    onChange?.(Number(e.target.value))
  }, [onChange])

  const handlePointerUp = useCallback(() => {
    onCommit?.(value)
  }, [onCommit, value])

  return (
    <div className={styles.wrapper}>
      {label && (
        <div className={styles.header}>
          <label htmlFor={id} className={styles.label}>{label}</label>
          <span className={styles.value}>{pct}%</span>
        </div>
      )}
      <div className={styles.track} style={trackStyle}>
        <div
          className={styles.thumbOverlay}
          style={{
            left: `${pct}%`,
            backgroundColor: color && pct > 0 ? color : 'var(--text-primary)',
            boxShadow: thumbGlow.boxShadow ?? 'var(--shadow-1)',
          }}
        />
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onPointerUp={handlePointerUp}
          className={styles.input}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  )
}
