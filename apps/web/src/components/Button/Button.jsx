import { useRef, useCallback } from 'react'
import { useSpring } from '../../lib/spring.js'
import styles from './Button.module.css'

/**
 * Button component.
 * Variants: primary | secondary | ghost | danger
 * Spring press animation on pointerdown/up.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const [scale, setScale] = useSpring(1, 'snappy')
  const pressing = useRef(false)

  const handlePointerDown = useCallback(() => {
    if (disabled || loading) return
    pressing.current = true
    setScale(0.96)
  }, [disabled, loading, setScale])

  const handlePointerUp = useCallback(() => {
    if (!pressing.current) return
    pressing.current = false
    setScale(1)
  }, [setScale])

  const handlePointerLeave = useCallback(() => {
    if (pressing.current) {
      pressing.current = false
      setScale(1)
    }
  }, [setScale])

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[styles.btn, styles[variant], styles[size], className].filter(Boolean).join(' ')}
      style={{ transform: `scale(${scale})` }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={disabled || loading ? undefined : onClick}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  )
}
