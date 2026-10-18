import { useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar/Sidebar.jsx'
import { MobileNav } from '../components/MobileNav/MobileNav.jsx'
import { InstallAppModal } from '../components/InstallAppModal/InstallAppModal.jsx'
import { ToastContainer } from '../components/Toast/Toast.jsx'
import { AmbientBackground } from '../components/AmbientBackground/AmbientBackground.jsx'
import { SpotifyPlayer } from '../components/SpotifyPlayer/SpotifyPlayer.jsx'
import { useUIStore } from '../stores/uiStore.js'
import { useDeviceStore } from '../stores/deviceStore.js'
import { useGroupStore } from '../stores/groupStore.js'
import { useSpatialStore } from '../stores/spatialStore.js'
import { settingsApi } from '../lib/api.js'
import { useDeviceWebSocket } from '../hooks/useDeviceWebSocket.js'
import { usePWAInstall } from '../hooks/usePWAInstall.js'
import styles from './AppLayout.module.css'

export function AppLayout() {
  useDeviceWebSocket()

  const headerAccentColor = useUIStore(s => s.headerAccentColor)
  const demoMode = useUIStore(s => s.demoMode)
  const setDemoMode = useUIStore(s => s.setDemoMode)
  const addToast = useUIStore(s => s.addToast)

  useEffect(() => {
    settingsApi.get().then(s => {
      if (s?.demo_mode === '1' || s?.demo_mode === 'true') {
        setDemoMode(true)
      }
    }).catch(() => {})
  }, [setDemoMode])

  const handleExitDemoMode = useCallback(async () => {
    try {
      await settingsApi.update({ demo_mode: '0' })
      setDemoMode(false)
      await Promise.all([
        useDeviceStore.getState().fetchDevices(),
        useGroupStore.getState().fetchGroups(),
        useSpatialStore.getState().fetchHierarchy(),
      ])
      addToast({
        message: 'Demo Mode disabled. Physical devices restored.',
        type: 'success',
      })
    } catch (err) {
      addToast({
        message: `Failed to exit demo mode: ${err.message}`,
        type: 'error',
      })
    }
  }, [setDemoMode, addToast])

  const {
    showInstallButton,
    canPromptNative,
    platform,
    isModalOpen,
    openModal,
    closeModal,
    promptNativeInstall,
  } = usePWAInstall()

  return (
    <div className={styles.shell}>
      <AmbientBackground />
      <Sidebar />
      <div className={styles.content}>
        {/* Demo Mode Ambient Banner */}
        {demoMode && (
          <div className={styles.demoBanner} role="status">
            <div className={styles.demoBannerContent}>
              <span className={styles.demoBadge}>DEMO MODE</span>
              <span className={styles.demoBannerText}>
                Simulating virtual WLED devices and 3D spatial floorplan. Physical devices are hidden but preserved.
              </span>
            </div>
            <button
              type="button"
              className={styles.exitDemoBtn}
              onClick={handleExitDemoMode}
              title="Return to live physical devices"
            >
              Exit Demo Mode
            </button>
          </div>
        )}
        {/* Mobile Navigation & Install Bar: only rendered on mobile */}
        <MobileNav
          showInstallButton={showInstallButton}
          onOpenInstall={openModal}
        />
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
      <SpotifyPlayer />
      <ToastContainer />
      <InstallAppModal
        isOpen={isModalOpen}
        onClose={closeModal}
        platform={platform}
        canPromptNative={canPromptNative}
        onPromptNative={promptNativeInstall}
      />
    </div>
  )
}
