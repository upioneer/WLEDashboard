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

  const handleClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    onChange?.(!checked)
  }, [disabled, checked, onChange])

  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      className={[styles.toggle, disabled && styles.disabled].filter(Boolean).join(' ')}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleClick(e)
        }
      }}
    >
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.track}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {}}
          disabled={disabled}
          id={id}
          className={styles.input}
          aria-label={label || 'Toggle power'}
          tabIndex={-1}
        />
        <span
          className={styles.knob}
          style={{ transform: `translateX(${knobX}px)` }}
        />
      </span>
    </div>
  )
}
