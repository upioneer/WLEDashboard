import { useCallback, useRef } from 'react'
import { useSpring } from '../../lib/spring.js'
import styles from './Toggle.module.css'

/**
 * Toggle switch with spring-animated knob (bouncy preset for visible overshoot).
 * Maps to WLED power on/off.
 */
export function Toggle({ checked = false, onChange, disabled = false, id, label }) {
  const KNOB_TRAVEL = 22  // px from left edge to right edge
  const [knobX, setKnobX] = useSpring(checked ? KNOB_TRAVEL : 0, 'bouncy')
  const prevChecked = useRef(checked)

  if (prevChecked.current !== checked) {
    prevChecked.current = checked
    setKnobX(checked ? KNOB_TRAVEL : 0)
  }

  const handleChange = useCallback((e) => {
    if (disabled) return
    onChange?.(e.target.checked)
  }, [disabled, onChange])

  return (
    <label className={[styles.toggle, disabled && styles.disabled].filter(Boolean).join(' ')}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.track} aria-checked={checked} role="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          id={id}
          className={styles.input}
          aria-label={label}
        />
        <span
          className={styles.knob}
          style={{ transform: `translateX(${knobX}px)` }}
        />
      </span>
    </label>
  )
}
