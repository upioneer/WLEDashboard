import { useEffect } from 'react'
import { useSpringGroup } from '../../lib/spring.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './Toast.module.css'

const ICONS = {
  info:    InfoIcon,
  success: SuccessIcon,
  error:   ErrorIcon,
  warning: WarningIcon,
}

const ACCENT = {
  info:    'var(--accent-cyan)',
  success: 'var(--accent-emerald)',
  error:   'var(--accent-rose)',
  warning: 'var(--accent-amber)',
}

export function Toast({ id, message, type = 'info' }) {
  const removeToast = useUIStore(s => s.removeToast)
  const Icon = ICONS[type] ?? InfoIcon

  const [vals, setVals] = useSpringGroup({ y: -20, opacity: 0 }, 'bouncy')

  useEffect(() => {
    // Slight delay so the spring has a DOM node to animate from
    const t = requestAnimationFrame(() => setVals({ y: 0, opacity: 1 }))
    return () => cancelAnimationFrame(t)
  }, [])

  const handleDismiss = () => {
    setVals({ y: -8, opacity: 0 })
    setTimeout(() => removeToast(id), 280)
  }

  return (
    <div
      className={styles.toast}
      style={{
        transform: `translateY(${vals.y}px)`,
        opacity: vals.opacity,
        '--accent': ACCENT[type],
      }}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden><Icon /></span>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.dismiss}
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <DismissIcon />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore(s => s.toasts)

  return (
    <div className={styles.container} aria-label="Notifications" aria-live="polite">
      {toasts.map(t => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="4" r="0.75" fill="currentColor" />
    </svg>
  )
}

function SuccessIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="4,7 6,9 10,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="5" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2L13 12H1L7 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="7" y1="6" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

function DismissIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
