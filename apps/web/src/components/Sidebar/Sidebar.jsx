import { useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore.js'
import { LogoMark } from '../Logo/LogoMark.jsx'
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
          <span className={styles.wordmark}>WLED<strong>ashboard</strong></span>
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
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [styles.navItem, isActive && styles.active].filter(Boolean).join(' ')
          }
        >
          <span className={styles.navIcon} aria-hidden><SettingsIcon /></span>
          {!collapsed && <span className={styles.navLabel}>Settings</span>}
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
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="9,4 9,9 12,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DevicesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="7" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="3" x2="9" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function StudioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 13 Q5 5 9 8 Q13 11 16 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
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
