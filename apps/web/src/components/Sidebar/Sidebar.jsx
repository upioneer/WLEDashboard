import { useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore.js'
import { LogoMark } from '../Logo/LogoMark.jsx'
import { useUpdateCheck } from '../../hooks/useUpdateCheck.js'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',      icon: DashIcon },
  { to: '/spatial',    label: 'Spatial View',   icon: SpatialIcon },
  { to: '/groups',     label: 'Groups',         icon: GroupsIcon },
  { to: '/automation', label: 'Automation',     icon: AutoIcon },
  { to: '/studio',     label: 'Studio',         icon: StudioIcon },
  { to: '/devices',    label: 'Device Manager', icon: DevicesIcon },
]

export function Sidebar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed)
  const toggle = useUIStore(s => s.toggleSidebar)
  const { updateAvailable } = useUpdateCheck(__APP_VERSION__)

  return (
    <aside
      className={[styles.sidebar, collapsed && styles.collapsed].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          <LogoMark />
        </span>
        {!collapsed && (
          <div className={styles.brandText}>
            <span className={styles.wordmark}>WLED<strong>ashboard</strong></span>
            <span className={styles.version}>v{__APP_VERSION__}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <ul role="list">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [styles.navItem, isActive && styles.active].filter(Boolean).join(' ')
                }
              >
                <span className={styles.navIcon} aria-hidden><Icon /></span>
                {!collapsed && <span className={styles.navLabel}>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <a
          href="https://github.com/upioneer/WLEDashboard/issues"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.navItem}
          title="Provide Feedback / Report Issue"
        >
          <span className={styles.navIcon} aria-hidden><FeedbackIcon /></span>
          {!collapsed && <span className={styles.navLabel}>Feedback</span>}
        </a>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [styles.navItem, isActive && styles.active].filter(Boolean).join(' ')
          }
        >
          <span className={styles.navIcon} aria-hidden style={{ position: 'relative' }}>
            <SettingsIcon />
            {updateAvailable && (
              <span className={styles.updateBadge} title={`Update v${updateAvailable} available!`} />
            )}
          </span>
          {!collapsed && (
            <span className={styles.navLabel} style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
              Settings
              {updateAvailable && <span className={styles.updateText}>Update</span>}
            </span>
          )}
        </NavLink>

        <button
          className={styles.collapseBtn}
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>
    </aside>
  )
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
// Using inline SVG to avoid any icon library dependency

function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SpatialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="9" y1="2" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="9" x2="16" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="9" x2="2" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function GroupsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="1" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="6" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9h1M11 9h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="3" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="2" r="1.5" fill="currentColor" />
    </svg>
  )
}

function DevicesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="4" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="6" x2="4" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="9" x2="4" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="2" x2="6" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="2" x2="9" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="14" x2="6" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="14" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function StudioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M13.5 2.5a2.121 2.121 0 0 1 3 3L13 9l-3-3 3.5-3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 6l-5 5c-1.5 1.5-3.5 1.5-3.5 1.5s0-2 1.5-3.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CollapseIcon({ collapsed }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out-expo)' }}>
      <polyline points="10,3 5,8 10,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 16c-1.5 0-3-.5-4.2-1.3L1 16l1.3-3.8C1.5 11 1 9.5 1 8c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" />
      <line x1="9" y1="5" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
