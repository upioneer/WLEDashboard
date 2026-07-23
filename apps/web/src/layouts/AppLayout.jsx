import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar/Sidebar.jsx'
import { ToastContainer } from '../components/Toast/Toast.jsx'
import { useUIStore } from '../stores/uiStore.js'
import { useDeviceWebSocket } from '../hooks/useDeviceWebSocket.js'
import styles from './AppLayout.module.css'

export function AppLayout() {
  useDeviceWebSocket()

  const headerAccentColor = useUIStore(s => s.headerAccentColor)

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.content}>
        <div
          className={styles.accentBar}
          style={{
            background: headerAccentColor
              ? `linear-gradient(to right, transparent, ${headerAccentColor}88, transparent)`
              : 'transparent',
          }}
          aria-hidden
        />
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  )
}
