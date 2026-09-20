import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { settingsApi, mqttApi, spotifyApi, weatherApi, configApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import { LocationMapPicker } from '../../components/LocationMapPicker/LocationMapPicker.jsx'
import { useUpdateCheck } from '../../hooks/useUpdateCheck.js'
import { copyToClipboard } from '../../lib/clipboard.js'
import styles from './Settings.module.css'

import { useAutomationStore } from '../../stores/automationStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { usePWAInstall } from '../../hooks/usePWAInstall.js'

const DEFAULTS = {
  poll_interval_ms: '5000',
  mdns_scan_interval_ms: '30000',
  latitude: '37.7749',
  longitude: '-122.4194',
  openweathermap_api_key: '',
  unit_prompt_shown: 'false',
  mqtt_enabled: '0',
  mqtt_broker_url: 'mqtt://localhost:1883',
  spotify_client_id: '',
  spotify_client_secret: '',
  spatial_intro_enabled: 'true',
  advanced_mode: 'false',
  demo_mode: '0',
}


const CONTRIBUTORS = [
  { name: 'ccalbreath', platform: 'github' },
  { name: 'Far_Confusion4003', platform: 'reddit' },
  { name: 'johnsonflix', platform: 'reddit' },
  { name: 'Netmindz', platform: 'reddit' },
  { name: 'New-Lawyer-2913', platform: 'reddit' },
  { name: 'pubultrastar', platform: 'reddit' },
  { name: 'Rev-777', platform: 'reddit' },
  { name: 'shr00mie', platform: 'github' },
  { name: 'sitbon', platform: 'reddit' },
  { name: 'somejock', platform: 'reddit' },
  { name: 'Sos0king', platform: 'reddit' },
  { name: 'ssjucrono', platform: 'reddit' },
  { name: 'tybyte', platform: 'reddit' },
  { name: 'Unlucky_Quote6394', platform: 'reddit' },
  { name: 'wivaca2', platform: 'reddit' },
  { name: 'zero-degrees28', platform: 'reddit' },
].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

// Selective restore categories. Mirrors BACKUP_CATEGORIES in apps/api/src/services/configService.js.
const RESTORE_CATEGORIES = [
  { key: 'devices', label: 'Devices', hint: 'Controllers, IPs, and hardware details.', tables: ['devices'] },
  { key: 'groups', label: 'Groups', hint: 'Groups plus device and group memberships.', tables: ['groups', 'group_members', 'group_children'] },
  { key: 'presets', label: 'Presets', hint: 'Saved device and group states.', tables: ['presets'] },
  { key: 'settings', label: 'Settings', hint: 'App settings, merged key by key.', tables: ['settings'] },
  { key: 'automations', label: 'Routines and automations', hint: 'Schedules, routines, and routine steps.', tables: ['schedules', 'routines', 'routine_steps'] },
  { key: 'spatial', label: 'Spatial layouts', hint: 'Dwellings, floors, rooms, and anchors.', tables: ['dwellings', 'floors', 'rooms', 'anchors'] },
  { key: 'studio', label: 'Studio palettes and timelines', hint: 'Animations, palettes, matrices, and drawings.', tables: ['animations', 'palettes', 'matrices', 'matrix_drawings'] },
]

const ALL_RESTORE_CATEGORIES = RESTORE_CATEGORIES.map((c) => c.key)

export function Settings() {
  const addToast = useUIStore(s => s.addToast)
  const liveWeatherWs = useUIStore(s => s.weatherState)
  const deviceIpClickAction = useUIStore(s => s.deviceIpClickAction)
  const setDeviceIpClickAction = useUIStore(s => s.setDeviceIpClickAction)
  const advancedMode = useUIStore(s => s.advancedMode)
  const setAdvancedMode = useUIStore(s => s.setAdvancedMode)
  const demoMode = useUIStore(s => s.demoMode)
  const setDemoMode = useUIStore(s => s.setDemoMode)
  const { showInstallButton, openModal: openInstallModal } = usePWAInstall()
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [showUnitPromptModal, setShowUnitPromptModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [copiedSpotifyUri, setCopiedSpotifyUri] = useState(false)
  const spotifyRedirectUri = typeof window !== 'undefined'
    ? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.origin}/api/spotify/callback`
        : `http://localhost:${window.location.port || '8301'}/api/spotify/callback`)
    : ''
  const [copiedApiToken, setCopiedApiToken]     = useState(false)
  const [copiedUpdateCmd, setCopiedUpdateCmd]   = useState(false)
  const [updatePlatform, setUpdatePlatform]     = useState('docker')
  const [showApiToken, setShowApiToken]         = useState(false)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherSyncing, setWeatherSyncing] = useState(false)
  const [testingCondition, setTestingCondition] = useState(null)
  const [showMappingEditor, setShowMappingEditor] = useState(false)
  const [customMappings, setCustomMappings] = useState(null)
  const { updateAvailable } = useUpdateCheck(__APP_VERSION__)

  // ── Backup & Restore state ───────────────────────────────────────────────────
  const [backupExporting, setBackupExporting]   = useState(false)
  const [restoreState, setRestoreState]         = useState('idle') // 'idle' | 'previewing' | 'importing'
  const [restorePreview, setRestorePreview]     = useState(null)   // parsed backup envelope before commit
  const [restoreMode, setRestoreMode]           = useState('merge') // 'merge' | 'replace'
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(ALL_RESTORE_CATEGORIES)
  const fileInputRef = useRef(null)

  const debounceTimers = useRef({})
  const saveStatusTimer = useRef(null)
  const pendingUpdates = useRef({})

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      spotifyApi.getStatus().catch(() => ({ connected: false })),
      weatherApi.getCurrent().catch(() => ({ state: null, mappings: null }))
    ]).then(([s, spot, weather]) => {
      setSettings({ ...DEFAULTS, ...s })
      if (s.advanced_mode !== undefined) {
        setAdvancedMode(s.advanced_mode === 'true')
      }
      if (s.demo_mode === '1' || s.demo_mode === 'true') {
        setDemoMode(true)
      }
      setSpotifyConnected(spot.connected)
      setWeatherData(weather.state)
      setCustomMappings(weather.mappings)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast({ message: 'Failed to load settings', type: 'error' })
    })
  }, [])

  // Sync live weather from WebSocket if available
  useEffect(() => {
    if (liveWeatherWs) {
      setWeatherData(liveWeatherWs)
    }
  }, [liveWeatherWs])

  const performSave = useCallback(async (updates) => {
    setSaveStatus('saving')
    try {
      await settingsApi.update(updates)
      if (updates.latitude !== undefined || updates.longitude !== undefined) {
        useAutomationStore.getState().fetchSunTimes().catch(() => {})
      }
      setSaveStatus('saved')
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
      saveStatusTimer.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2500)
    } catch {
      setSaveStatus('error')
      addToast({ message: 'Failed to auto-save settings', type: 'error' })
    }
  }, [addToast])

  const handleImmediateChange = useCallback((key, value) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
      delete debounceTimers.current[key]
    }
    delete pendingUpdates.current[key]
    setSettings(s => ({ ...s, [key]: value }))
    performSave({ [key]: value })
  }, [performSave])

  const handleDebouncedChange = useCallback((key, value) => {
    setSettings(s => ({ ...s, [key]: value }))
    pendingUpdates.current[key] = value

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
    }

    debounceTimers.current[key] = setTimeout(() => {
      delete debounceTimers.current[key]
      const val = pendingUpdates.current[key]
      delete pendingUpdates.current[key]
      performSave({ [key]: val })
    }, 400)
  }, [performSave])

  const handleBlur = useCallback((key) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
      delete debounceTimers.current[key]
      if (key in pendingUpdates.current) {
        const val = pendingUpdates.current[key]
        delete pendingUpdates.current[key]
        performSave({ [key]: val })
      }
    }
  }, [performSave])

  const handleToggleAdvancedMode = useCallback((e) => {
    const val = e.target.checked
    setAdvancedMode(val)
    handleImmediateChange('advanced_mode', val ? 'true' : 'false')
  }, [handleImmediateChange, setAdvancedMode])

  const handleConfirmEnableDemo = useCallback(async () => {
    try {
      setShowDemoModal(false)
      await settingsApi.update({ demo_mode: '1' })
      setDemoMode(true)
      setSettings(s => ({ ...s, demo_mode: '1' }))
      await Promise.all([
        useDeviceStore.getState().fetchDevices(),
        useGroupStore.getState().fetchGroups(),
        useSpatialStore.getState().fetchHierarchy(),
      ])
      addToast({
        message: 'Demo Mode enabled. Virtual controllers and companion floorplan loaded.',
        type: 'success',
      })
    } catch (err) {
      addToast({
        message: `Failed to enable demo mode: ${err.message}`,
        type: 'error',
      })
    }
  }, [setDemoMode, addToast])

  const handleDisableDemo = useCallback(async () => {
    try {
      await settingsApi.update({ demo_mode: '0' })
      setDemoMode(false)
      setSettings(s => ({ ...s, demo_mode: '0' }))
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

  const handleLocationChange = useCallback((lat, lng, immediate = true) => {
    const latStr = String(lat)
    const lngStr = String(lng)
    setSettings(s => {
      if (s.unit_prompt_shown !== 'true') {
        setShowUnitPromptModal(true)
      }
      return { ...s, latitude: latStr, longitude: lngStr }
    })

    if (immediate) {
      if (debounceTimers.current.location) clearTimeout(debounceTimers.current.location)
      delete pendingUpdates.current.latitude
      delete pendingUpdates.current.longitude
      performSave({ latitude: latStr, longitude: lngStr })
    } else {
      pendingUpdates.current.latitude = latStr
      pendingUpdates.current.longitude = lngStr
      if (debounceTimers.current.location) clearTimeout(debounceTimers.current.location)
      debounceTimers.current.location = setTimeout(() => {
        delete debounceTimers.current.location
        const updates = {
          latitude: pendingUpdates.current.latitude,
          longitude: pendingUpdates.current.longitude,
        }
        delete pendingUpdates.current.latitude
        delete pendingUpdates.current.longitude
        performSave(updates)
      }, 400)
    }
  }, [performSave])

  const handleSelectUnitPreference = useCallback(async (choice) => {
    const updated = {
      unit_prompt_shown: 'true',
    }
    if (choice) updated.unit_system = choice

    setSettings(s => ({ ...s, ...updated }))
    setShowUnitPromptModal(false)
    performSave(updated)
    if (choice) {
      addToast({ message: `Unit system set to ${choice}`, type: 'success' })
    }
  }, [performSave, addToast])

  const handleCopyUpdateCmd = useCallback(async () => {
    const cmd = updatePlatform === 'proxmox'
      ? 'pct exec <CTID> -- update-wledashboard'
      : 'docker compose pull && docker compose up -d'
    const ok = await copyToClipboard(cmd)
    if (ok) {
      setCopiedUpdateCmd(true)
      setTimeout(() => setCopiedUpdateCmd(false), 2000)
      addToast({ message: 'Update command copied to clipboard', type: 'success' })
    } else {
      addToast({ message: 'Failed to copy update command', type: 'error' })
    }
  }, [updatePlatform, addToast])

  // ── Backup Export ────────────────────────────────────────────────────────────
  const handleBackupExport = useCallback(async () => {
    setBackupExporting(true)
    try {
      const config = await configApi.export()
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `wledashboard-backup-v${__APP_VERSION__}-${ts}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ message: 'Backup downloaded successfully', type: 'success' })
    } catch (err) {
      addToast({ message: `Backup failed: ${err.message}`, type: 'error' })
    } finally {
      setBackupExporting(false)
    }
  }, [addToast])

  // ── Restore: File Selection & Preview ────────────────────────────────────────
  const handleRestoreFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed?.data || typeof parsed.data !== 'object') {
          addToast({ message: 'Invalid backup file: missing data envelope', type: 'error' })
          return
        }
        setRestorePreview(parsed)
        setRestoreState('previewing')
        setSelectedCategories(ALL_RESTORE_CATEGORIES)
        setRestoreMode('merge')
        setShowReplaceConfirm(false)
      } catch {
        addToast({ message: 'Invalid backup file: could not parse JSON', type: 'error' })
      }
    }
    reader.readAsText(file)
  }, [addToast])

  const handleRestoreDismiss = useCallback(() => {
    setRestorePreview(null)
    setRestoreState('idle')
    setShowReplaceConfirm(false)
    setSelectedCategories(ALL_RESTORE_CATEGORIES)
    setRestoreMode('merge')
  }, [])

  const toggleRestoreCategory = useCallback((key) => {
    setSelectedCategories((prev) => (
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    ))
    setShowReplaceConfirm(false)
  }, [])

  // ── Restore: Commit ──────────────────────────────────────────────────────────
  const handleRestoreCommit = useCallback(async () => {
    if (!restorePreview?.data || selectedCategories.length === 0) return
    setRestoreState('importing')
    try {
      const scoped = selectedCategories.length < ALL_RESTORE_CATEGORIES.length
      const result = await configApi.import(
        restorePreview.data,
        restoreMode,
        scoped ? selectedCategories : undefined,
      )
      const skippedCount = Object.values(result.skipped ?? {}).reduce((n, v) => n + v, 0)
      addToast({
        message: `Restore complete. Devices: ${result.stats.devices}, Routines: ${result.stats.routines}, Rooms: ${result.stats.rooms}${skippedCount > 0 ? `, Skipped orphans: ${skippedCount}` : ''}`,
        type: 'success',
      })
      if ((result.warnings ?? []).length > 0) {
        addToast({ message: result.warnings[0], type: 'error' })
      }
      setRestorePreview(null)
      setRestoreState('idle')
      setShowReplaceConfirm(false)
      setSelectedCategories(ALL_RESTORE_CATEGORIES)
    } catch (err) {
      addToast({ message: `Restore failed: ${err.message}`, type: 'error' })
      setRestoreState('previewing')
    }
  }, [restorePreview, restoreMode, selectedCategories, addToast])

  if (loading) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.skeleton} />
      </main>
    )
  }

  return (
    <main className={styles.page} id="main-content">
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.saveStatusBadge} aria-live="polite">
          {saveStatus === 'saving' && (
            <span className={styles.savingText}>
              <svg className={styles.savingSpinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className={styles.savedText}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className={styles.errorText}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Failed to save
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className={styles.idleText}>
              All changes saved
            </span>
          )}
        </div>
      </header>

      {updateAvailable && (
        <div className={styles.updateBanner}>
          <div className={styles.updateBannerText}>
            <h3>Update Available: v{updateAvailable}</h3>
            <p>A new version of WLEDashboard is available! You can update seamlessly without losing any data or configuration.</p>
          </div>
          <div className={styles.updateInstructions}>
            <div className={styles.updatePlatformHeader}>
              <p className={styles.updateInstructionsHeader}>Select your deployment platform:</p>
              <div className={styles.platformToggleGroup} role="tablist" aria-label="Deployment platform">
                <button
                  type="button"
                  role="tab"
                  aria-selected={updatePlatform === 'docker'}
                  className={[styles.platformToggleBtn, updatePlatform === 'docker' && styles.platformToggleActive].filter(Boolean).join(' ')}
                  onClick={() => setUpdatePlatform('docker')}
                >
                  Docker Compose
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={updatePlatform === 'proxmox'}
                  className={[styles.platformToggleBtn, updatePlatform === 'proxmox' && styles.platformToggleActive].filter(Boolean).join(' ')}
                  onClick={() => setUpdatePlatform('proxmox')}
                >
                  Proxmox VE (LXC)
                </button>
              </div>
            </div>

            {updatePlatform === 'docker' ? (
              <>
                <p className={styles.updateInstructionsHeader}>Run the following command in your terminal where docker-compose.yml resides:</p>
                <div className={styles.updateCodeRow}>
                  <code className={styles.updateCodeBlock}>docker compose pull &amp;&amp; docker compose up -d</code>
                  <button
                    type="button"
                    className={[styles.copyUpdateBtn, copiedUpdateCmd && styles.copyUpdateBtnCopied].filter(Boolean).join(' ')}
                    onClick={handleCopyUpdateCmd}
                    title="Copy update command to clipboard"
                    aria-label="Copy update command to clipboard"
                  >
                    {copiedUpdateCmd ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={styles.updateTipsRow}>
                  <span className={styles.updateTip}>
                    <strong>Port 3001 Bookmarks:</strong> If upgrading from versions prior to v0.21.0, map <code>3001:8301</code> under ports in your docker-compose.yml to preserve bookmarks.
                  </span>
                  <span className={styles.updateTip}>
                    <strong>Watchtower:</strong> Automated background updates can be enabled by uncommenting the <code>com.centurylinklabs.watchtower.enable=true</code> label in your docker-compose.yml.
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className={styles.updateInstructionsHeader}>From your Proxmox host shell (replace &lt;CTID&gt; with your container ID):</p>
                <div className={styles.updateCodeRow}>
                  <code className={styles.updateCodeBlock}>pct exec &lt;CTID&gt; -- update-wledashboard</code>
                  <button
                    type="button"
                    className={[styles.copyUpdateBtn, copiedUpdateCmd && styles.copyUpdateBtnCopied].filter(Boolean).join(' ')}
                    onClick={handleCopyUpdateCmd}
                    title="Copy update command to clipboard"
                    aria-label="Copy update command to clipboard"
                  >
                    {copiedUpdateCmd ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={styles.updateTipsRow}>
                  <span className={styles.updateTip}>
                    <strong>Inside Container Shell:</strong> If logged into the container console via <code>pct enter &lt;CTID&gt;</code>, you can run <code>update-wledashboard</code> directly.
                  </span>
                  <span className={styles.updateTip}>
                    <strong>Data Persistence:</strong> All SQLite database tables and configuration files in <code>/opt/wledashboard/data</code> are fully preserved during upgrades.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.sections}>
        {/* Unit System & Display */}
        <section className={styles.section} aria-labelledby="units-heading">
          <h2 id="units-heading" className={styles.sectionTitle}>Display & Unit System</h2>
          <p className={styles.sectionDesc}>
            Choose your preferred measurement system for 3D Spatial View room dimensions and layout positioning.
          </p>
          <div className={styles.fields}>
            <SettingField
              label="Room Dimension Units"
              hint="Imperial (Feet - ft) or Metric (Meters - m)"
              id="unit_system"
            >
              <div className={styles.unitToggleGroup}>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, settings.unit_system === 'imperial' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => handleImmediateChange('unit_system', 'imperial')}
                >
                  Imperial (ft)
                </button>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, settings.unit_system === 'metric' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => handleImmediateChange('unit_system', 'metric')}
                >
                  Metric (m)
                </button>
              </div>
            </SettingField>

            <SettingField
              label="Device Card IP Click Action"
              hint="Choose default behavior when clicking a controller's IP address on the dashboard"
              id="ip_click_action"
            >
              <div className={styles.unitToggleGroup}>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, deviceIpClickAction === 'menu' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => setDeviceIpClickAction('menu')}
                  title="Prompt with Open Web UI and Copy IP options"
                >
                  Action Menu
                </button>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, deviceIpClickAction === 'open' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => setDeviceIpClickAction('open')}
                  title="Directly launch the WLED instance in a new browser tab"
                >
                  Open in New Tab
                </button>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, deviceIpClickAction === 'copy' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => setDeviceIpClickAction('copy')}
                  title="Directly copy the IP address to clipboard"
                >
                  Copy IP
                </button>
              </div>
            </SettingField>

            <SettingField
              label="Interactive Demo Mode"
              hint="Test-drive WLEDashboard with simulated virtual controllers and a companion 3D spatial floorplan"
              id="demo_mode"
            >
              {demoMode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={styles.demoActiveBadge}>
                    <span className={styles.demoActiveDot}></span>
                    Active
                  </span>
                  <button
                    type="button"
                    className={styles.unitToggleBtn}
                    onClick={handleDisableDemo}
                  >
                    Exit Demo Mode
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.promptBtnPrimary}
                  onClick={() => setShowDemoModal(true)}
                  style={{ height: '36px', padding: '0 1.25rem' }}
                >
                  Enable Demo Mode
                </button>
              )}
            </SettingField>
          </div>
        </section>

        {/* Spatial View Options */}
        <section className={styles.section} aria-labelledby="spatial-heading">
          <h2 id="spatial-heading" className={styles.sectionTitle}>Spatial View</h2>
          <p className={styles.sectionDesc}>
            Configure your 3D digital twin experience.
          </p>
          <div className={styles.fields}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>Play Globe Intro</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Show the futuristic Earth animation zooming into your location on load.</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.spatial_intro_enabled !== 'false' && settings.spatial_intro_enabled !== false}
                  onChange={(e) => handleImmediateChange('spatial_intro_enabled', e.target.checked ? 'true' : 'false')}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </section>

        {/* Polling */}
        <section className={styles.section} aria-labelledby="polling-heading">
          <h2 id="polling-heading" className={styles.sectionTitle}>Polling</h2>
          <p className={styles.sectionDesc}>
            How often WLEDashboard fetches state from each device. Lower values
            are more responsive but increase network traffic.
          </p>
          <div className={styles.fields}>
            <SettingField
              label="Device poll interval"
              hint="Milliseconds between state requests per device"
              id="poll_interval_ms"
            >
              <NumberInput
                id="poll_interval_ms"
                value={settings.poll_interval_ms}
                onChange={v => handleDebouncedChange('poll_interval_ms', v)}
                onBlur={() => handleBlur('poll_interval_ms')}
                min={1000}
                max={60000}
                step={500}
                unit="ms"
              />
            </SettingField>

            <SettingField
              label="mDNS scan interval"
              hint="How often to scan for new WLED devices on the network"
              id="mdns_scan_interval_ms"
            >
              <NumberInput
                id="mdns_scan_interval_ms"
                value={settings.mdns_scan_interval_ms}
                onChange={v => handleDebouncedChange('mdns_scan_interval_ms', v)}
                onBlur={() => handleBlur('mdns_scan_interval_ms')}
                min={5000}
                max={300000}
                step={5000}
                unit="ms"
              />
            </SettingField>
          </div>
        </section>

        {/* Media Sync */}
        <section className={styles.section} aria-labelledby="media-heading">
          <h2 id="media-heading" className={styles.sectionTitle}>Media Sync</h2>
          <p className={styles.sectionDesc}>
            Connect your Spotify account to automatically extract album art colors and sync them to your WLED devices. Requires a <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>Spotify Developer App</a>.
          </p>
          <div style={{ background: '#12141d', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', border: '1px solid #2d3348' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Spotify Dashboard Setup</h4>
            <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.5' }}>
              <li style={{ marginBottom: '0.5rem' }}><strong>APIs/SDKs:</strong> Select <strong>Web API</strong>.</li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Website:</strong> Enter <code>https://wledashboard.com</code> or your domain (informational display metadata in Spotify portal).
              </li>
              <li>
                <strong>Redirect URIs (Strict):</strong> Spotify strictly requires Redirect URIs to be secure (HTTPS) unless using <code>localhost</code>. 
                Copy and paste the exact URL below into your Spotify Developer dashboard:
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    readOnly 
                    value={spotifyRedirectUri}
                    style={{ flex: 1, background: '#1a1d29', border: '1px solid #2d3348', borderRadius: '4px', padding: '0.4rem 0.6rem', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <button 
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(spotifyRedirectUri)
                      if (ok) {
                        setCopiedSpotifyUri(true)
                        setTimeout(() => setCopiedSpotifyUri(false), 2000)
                        addToast({ message: 'Redirect URI copied to clipboard!', type: 'success' })
                      } else {
                        addToast({ message: 'Failed to copy redirect URI', type: 'error' })
                      }
                    }}
                    style={{ 
                      background: copiedSpotifyUri ? '#10b981' : '#2d3348', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '4px', 
                      padding: '0 0.75rem', 
                      cursor: 'pointer', 
                      fontSize: '0.8rem',
                      fontWeight: copiedSpotifyUri ? 'bold' : 'normal',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: copiedSpotifyUri ? 'scale(0.95)' : 'scale(1)'
                    }}
                  >
                    {copiedSpotifyUri ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                {!(window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#3f1616', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                    <strong>Warning:</strong> You are accessing this dashboard via an insecure IP (<code>{window.location.hostname}</code>). Spotify will reject this IP. You must temporarily access the dashboard via <code>http://localhost:{window.location.port || '8301'}</code> (e.g. from the host machine or via SSH tunnel) to perform the initial Spotify connection, or set up a reverse proxy with HTTPS.
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  Behind Cloudflare Tunnel or a reverse proxy? Read our <Link to="/guides?topic=cloudflare-tunnel-reverse-proxy" style={{ color: 'var(--accent-cyan)' }}>Remote Access &amp; Reverse Proxy Guide</Link>.
                </div>
              </li>
            </ol>
          </div>
          <div className={styles.fields}>
            <SettingField
              label="Spotify Client ID"
              hint="Found in your Spotify Developer Dashboard"
              id="spotify_client_id"
            >
              <TextInput
                id="spotify_client_id"
                value={settings.spotify_client_id || ''}
                onChange={v => handleDebouncedChange('spotify_client_id', v)}
                onBlur={() => handleBlur('spotify_client_id')}
                placeholder="Enter Client ID"
              />
            </SettingField>

            <SettingField
              label="Spotify Client Secret"
              hint="Found in your Spotify Developer Dashboard"
              id="spotify_client_secret"
            >
              <TextInput
                id="spotify_client_secret"
                type="password"
                value={settings.spotify_client_secret || ''}
                onChange={v => handleDebouncedChange('spotify_client_secret', v)}
                onBlur={() => handleBlur('spotify_client_secret')}
                placeholder="Enter Client Secret"
              />
            </SettingField>

            <div className={styles.mqttActionRow}>
              {spotifyConnected ? (
                <>
                  <span style={{ color: 'var(--color-success, #10b981)', marginRight: '1rem', fontWeight: 600 }}>Spotify Connected ✓</span>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={async () => {
                      try {
                        await spotifyApi.disconnect()
                        setSpotifyConnected(false)
                        addToast({ message: 'Spotify disconnected', type: 'success' })
                      } catch {
                        addToast({ message: 'Failed to disconnect', type: 'error' })
                      }
                    }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <a
                  href={`/api/spotify/login?redirect_uri=${encodeURIComponent(spotifyRedirectUri)}`}
                  className={styles.secondaryBtn}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => {
                    if (!settings.spotify_client_id || !settings.spotify_client_secret) {
                      e.preventDefault()
                      addToast({ message: 'Please enter your Spotify Client ID and Secret first!', type: 'error' })
                    }
                  }}
                >
                  Connect to Spotify
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Weather Sync */}
        <section className={styles.section} aria-labelledby="weather-heading">
          <h2 id="weather-heading" className={styles.sectionTitle}>Weather Sync</h2>
          <p className={styles.sectionDesc}>
            Connect OpenWeatherMap to automatically reflect live weather conditions via WLED effects on your ambient lights. Requires a free API key from <a href="https://home.openweathermap.org/api_keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>OpenWeatherMap</a>.
          </p>

          <div className={styles.fields}>
            <SettingField
              label="OpenWeatherMap API Key"
              hint="Paste your free API key here to enable automated weather polling."
              id="openweathermap_api_key"
            >
              <TextInput
                id="openweathermap_api_key"
                value={settings.openweathermap_api_key || ''}
                onChange={v => handleDebouncedChange('openweathermap_api_key', v)}
                onBlur={() => handleBlur('openweathermap_api_key')}
                placeholder="00000000000000000000000000000000"
              />
            </SettingField>

            {/* Live Weather Status Card */}
            {weatherData && weatherData.status === 'active' && (
              <div className={styles.weatherCard}>
                <div className={styles.weatherHeader}>
                  <div className={styles.weatherHeaderMain}>
                    <span className={styles.weatherTemp}>
                      {settings.unit_system === 'metric' ? `${weatherData.temp_c}°C` : `${weatherData.temp_f}°F`}
                    </span>
                    <div>
                      <div className={styles.weatherCity}>{weatherData.city || 'Local Area'}, {weatherData.country || ''}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                        {weatherData.description || weatherData.condition_name} ({weatherData.is_day ? 'Daytime' : 'Night'})
                      </div>
                    </div>
                  </div>

                  <span className={styles.weatherConditionBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                    </svg>
                    {weatherData.condition_name || 'Active'}
                  </span>
                </div>

                <div className={styles.weatherStatsGrid}>
                  <div className={styles.weatherStatItem}>
                    <span className={styles.weatherStatLabel}>Humidity</span>
                    <span className={styles.weatherStatValue}>{weatherData.humidity ?? '--'}%</span>
                  </div>
                  <div className={styles.weatherStatItem}>
                    <span className={styles.weatherStatLabel}>Wind Speed</span>
                    <span className={styles.weatherStatValue}>
                      {weatherData.wind_speed != null 
                        ? (settings.unit_system === 'metric' ? `${weatherData.wind_speed} m/s` : `${Math.round(weatherData.wind_speed * 2.237)} mph`) 
                        : '--'}
                    </span>
                  </div>
                  <div className={styles.weatherStatItem}>
                    <span className={styles.weatherStatLabel}>Last Synced</span>
                    <span className={styles.weatherStatValue}>
                      {weatherData.last_sync_at ? new Date(weatherData.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                  <div className={styles.weatherStatItem}>
                    <span className={styles.weatherStatLabel}>Active Targets</span>
                    <span className={styles.weatherStatValue}>
                      {weatherData.targetCounts?.devices || 0} dev, {weatherData.targetCounts?.groups || 0} grp
                    </span>
                  </div>
                </div>

                <div className={styles.weatherActionsRow}>
                  <div className={styles.weatherTargetsNotice}>
                    Syncing live to <strong className={styles.weatherTargetsCount}>{weatherData.targetCounts?.devices || 0} devices</strong> and <strong className={styles.weatherTargetsCount}>{weatherData.targetCounts?.groups || 0} groups</strong>.
                  </div>

                  <button
                    type="button"
                    className={styles.syncNowBtn}
                    disabled={weatherSyncing}
                    onClick={async () => {
                      setWeatherSyncing(true)
                      try {
                        const res = await weatherApi.syncNow()
                        if (res.state) setWeatherData(res.state)
                        addToast({ message: 'Live weather synced to lights', type: 'success' })
                      } catch {
                        addToast({ message: 'Failed to sync weather', type: 'error' })
                      } finally {
                        setWeatherSyncing(false)
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ animation: weatherSyncing ? 'spin 1s linear infinite' : 'none' }}>
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                      <path d="M16 21h5v-5"/>
                    </svg>
                    {weatherSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Condition Simulator / Preview Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className={styles.simSubheading}>Simulate & Preview Conditions on Synced Lights</div>
              <div className={styles.weatherSimGrid}>
                {[
                  { key: 'thunderstorm', label: 'Thunderstorm' },
                  { key: 'rain',         label: 'Rain' },
                  { key: 'drizzle',      label: 'Drizzle' },
                  { key: 'snow',         label: 'Snow' },
                  { key: 'atmosphere',   label: 'Mist / Fog' },
                  { key: 'clear_day',    label: 'Clear Day' },
                  { key: 'clear_night',  label: 'Clear Night' },
                  { key: 'clouds',       label: 'Cloudy' },
                  { key: 'extreme',      label: 'Extreme Alert' },
                ].map(cond => (
                  <button
                    type="button"
                    key={cond.key}
                    className={styles.weatherSimBtn}
                    disabled={testingCondition === cond.key}
                    onClick={async () => {
                      setTestingCondition(cond.key)
                      try {
                        await weatherApi.testCondition(cond.key)
                        addToast({ message: `Simulating ${cond.label} on lights`, type: 'info' })
                      } catch {
                        addToast({ message: 'Failed to simulate condition', type: 'error' })
                      } finally {
                        setTimeout(() => setTestingCondition(null), 500)
                      }
                    }}
                  >
                    {testingCondition === cond.key ? 'Testing...' : cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Condition Mappings Toggle & Editor */}
            <div>
              <button
                type="button"
                className={styles.mappingToggleBtn}
                onClick={() => setShowMappingEditor(prev => !prev)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                {showMappingEditor ? 'Hide Condition Lighting Config' : 'Customize Condition Lighting Effects'}
              </button>

              {showMappingEditor && customMappings && (
                <div className={styles.mappingEditor} style={{ marginTop: '0.75rem' }}>
                  {Object.entries(customMappings).map(([condKey, config]) => {
                    const primaryRgb = config.col?.[0] || [255, 255, 255]
                    const hexColor = `#${primaryRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`
                    return (
                      <div key={condKey} className={styles.mappingRow}>
                        <div className={styles.mappingMeta}>
                          <span className={styles.mappingName}>{config.name || condKey}</span>
                          <span className={styles.mappingDesc}>{config.description || ''}</span>
                        </div>

                        <div className={styles.mappingControls}>
                          <input
                            type="color"
                            value={hexColor}
                            className={styles.mappingColorInput}
                            title="Primary Condition Color"
                            onChange={(e) => {
                              const hex = e.target.value
                              const r = parseInt(hex.slice(1, 3), 16)
                              const g = parseInt(hex.slice(3, 5), 16)
                              const b = parseInt(hex.slice(5, 7), 16)
                              setCustomMappings(prev => ({
                                ...prev,
                                [condKey]: {
                                  ...prev[condKey],
                                  col: [[r, g, b], prev[condKey]?.col?.[1] || [0, 0, 0], prev[condKey]?.col?.[2] || [0, 0, 0]],
                                }
                              }))
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={async () => {
                        try {
                          await weatherApi.saveMappings(customMappings)
                          addToast({ message: 'Weather lighting mappings saved', type: 'success' })
                        } catch {
                          addToast({ message: 'Failed to save mappings', type: 'error' })
                        }
                      }}
                    >
                      Save Custom Mappings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>


        {/* Home Assistant & MQTT Integration */}
        <section className={styles.section} aria-labelledby="mqtt-heading">
          <h2 id="mqtt-heading" className={styles.sectionTitle}>Home Assistant & MQTT Integration</h2>
          <p className={styles.sectionDesc}>
            Enable MQTT to automatically publish WLED devices, groups, and spatial scenes to Home Assistant via MQTT Auto-Discovery.
          </p>
          <div className={styles.fields}>
            <SettingField
              label="Enable Home Assistant MQTT Bridge"
              hint="Publishes devices and listens for HA control commands"
              id="mqtt_enabled"
            >
              <select
                id="mqtt_enabled"
                value={settings.mqtt_enabled}
                onChange={e => handleImmediateChange('mqtt_enabled', e.target.value)}
                className={styles.selectInput}
              >
                <option value="0">Disabled</option>
                <option value="1">Enabled</option>
              </select>
            </SettingField>

            <SettingField
              label="MQTT Broker URL"
              hint="Broker connection string (e.g. mqtt://localhost:1883)"
              id="mqtt_broker_url"
            >
              <input
                type="text"
                id="mqtt_broker_url"
                value={settings.mqtt_broker_url}
                onChange={e => handleDebouncedChange('mqtt_broker_url', e.target.value)}
                onBlur={() => handleBlur('mqtt_broker_url')}
                className={styles.textInput}
              />
            </SettingField>

            <div className={styles.mqttActionRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={async () => {
                  try {
                    await mqttApi.configure({
                      enabled: settings.mqtt_enabled === '1',
                      broker_url: settings.mqtt_broker_url,
                    })
                    await mqttApi.publishDiscovery()
                    addToast({ message: 'Published Home Assistant MQTT Auto-Discovery payloads', type: 'success' })
                  } catch {
                    addToast({ message: 'Failed to configure MQTT bridge', type: 'error' })
                  }
                }}
              >
                Publish HA Discovery Payload
              </button>
            </div>

            {/* Long-Lived API Access Token */}
            <SettingField
              label="Long-Lived API Token"
              hint="Use this token to authenticate the official WLEDashboard Home Assistant integration or external REST/WebSocket clients"
              id="api_token"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <input
                    type={showApiToken ? 'text' : 'password'}
                    readOnly
                    value={settings.api_token || ''}
                    style={{ flex: 1, background: 'var(--surface-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-s)', padding: '0.4rem 0.6rem', color: 'var(--accent-amber)', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiToken(prev => !prev)}
                    className={styles.secondaryBtn}
                    style={{ padding: '0 0.75rem', fontSize: '0.8rem' }}
                  >
                    {showApiToken ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!settings.api_token) return
                      const ok = await copyToClipboard(settings.api_token)
                      if (ok) {
                        setCopiedApiToken(true)
                        setTimeout(() => setCopiedApiToken(false), 2000)
                        addToast({ message: 'API Token copied to clipboard', type: 'success' })
                      } else {
                        addToast({ message: 'Failed to copy API token', type: 'error' })
                      }
                    }}
                    className={styles.secondaryBtn}
                    style={{
                      background: copiedApiToken ? 'var(--accent-emerald)' : undefined,
                      color: copiedApiToken ? '#000' : undefined,
                      padding: '0 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: copiedApiToken ? 600 : 'normal',
                    }}
                  >
                    {copiedApiToken ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-rose)', borderColor: 'hsl(348 72% 58% / 0.3)' }}
                    onClick={async () => {
                      try {
                        const res = await settingsApi.regenerateApiToken()
                        if (res.api_token) {
                          setSettings(prev => ({ ...prev, api_token: res.api_token }))
                          addToast({ message: 'New API token generated', type: 'success' })
                        }
                      } catch {
                        addToast({ message: 'Failed to regenerate API token', type: 'error' })
                      }
                    }}
                  >
                    Regenerate API Token
                  </button>
                </div>
              </div>
            </SettingField>
          </div>
        </section>

        {/* Location & Astronomical Solar Times */}
        <section className={styles.section} aria-labelledby="location-heading">
          <h2 id="location-heading" className={styles.sectionTitle}>Location & Astronomy</h2>
          <p className={styles.sectionDesc}>
            Tap anywhere on the map or click auto-detect to select your general region.
            A 15km privacy circle indicates your solar calculations area without needing your exact street address.
          </p>

          <LocationMapPicker
            lat={settings.latitude}
            lng={settings.longitude}
            onChange={(lat, lng) => handleLocationChange(lat, lng, true)}
          />

          <div className={styles.fields}>
            <SettingField
              label="Latitude"
              hint="Latitude coordinate"
              id="latitude"
            >
              <TextInput
                id="latitude"
                value={settings.latitude || ''}
                onChange={v => handleLocationChange(v, settings.longitude, false)}
                onBlur={() => handleBlur('location')}
                placeholder="37.7749"
              />
            </SettingField>

            <SettingField
              label="Longitude"
              hint="Longitude coordinate"
              id="longitude"
            >
              <TextInput
                id="longitude"
                value={settings.longitude || ''}
                onChange={v => handleLocationChange(settings.latitude, v, false)}
                onBlur={() => handleBlur('location')}
                placeholder="-122.4194"
              />
            </SettingField>

            <div className={styles.detectRow}>
              <button
                type="button"
                className={styles.detectBtn}
                onClick={() => {
                  if (!navigator.geolocation) {
                    addToast({ message: 'Browser geolocation not supported', type: 'error' })
                    return
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const lat = pos.coords.latitude.toFixed(4)
                      const lng = pos.coords.longitude.toFixed(4)
                      handleLocationChange(lat, lng, true)
                      addToast({ message: `Location detected: ${lat}, ${lng}`, type: 'success' })
                    },
                    (err) => {
                      addToast({ message: `Location error: ${err.message}`, type: 'error' })
                    }
                  )
                }}
              >
                Auto-Detect Location (Browser GPS)
              </button>
            </div>
          </div>
        </section>

        {/* Mobile Web App (dynamically hidden on desktop) */}
        {showInstallButton && (
          <section className={styles.section} aria-labelledby="mobile-app-heading">
            <h2 id="mobile-app-heading" className={styles.sectionTitle}>Mobile Web App</h2>
            <div className={styles.field}>
              <div className={styles.fieldMeta}>
                <span className={styles.fieldLabel}>Install WLEDashboard</span>
                <p className={styles.fieldHint}>
                  Run WLEDashboard as a standalone full-screen web app directly on your mobile device.
                </p>
              </div>
              <div className={styles.fieldControl}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={openInstallModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'var(--accent-violet-10)',
                    color: 'var(--accent-violet)',
                    borderColor: 'var(--accent-violet)',
                    fontWeight: 600,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Install App to Home Screen
                </button>
              </div>
            </div>
          </section>
        )}
        {/* Advanced Mode */}
        <section className={styles.section} aria-labelledby="advanced-heading">
          <div className={styles.sectionHeader}>
            <h2 id="advanced-heading" className={styles.sectionTitle}>Advanced Mode</h2>
            <p className={styles.sectionSubtitle}>
              Unlock developer telemetry, live activity stream console, low-level diagnostics, and administrative controls.
            </p>
          </div>
          <div className={styles.fields}>
            <SettingField
              label="Enable Advanced Mode"
              hint="Adds an Advanced system page to the sidebar featuring process health, real-time activity streaming, network diagnostics, and administrative tools."
              id="advanced_mode"
            >
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  id="advanced_mode"
                  checked={advancedMode}
                  onChange={handleToggleAdvancedMode}
                />
                <span className={styles.toggleSlider} />
              </label>
            </SettingField>
          </div>
        </section>

        {/* About */}
        {/* Backup & Restore */}
        <section className={styles.section} aria-labelledby="backup-heading">
          <div className={styles.sectionHeader}>
            <h2 id="backup-heading" className={styles.sectionTitle}>Backup & Restore</h2>
            <p className={styles.sectionSubtitle}>
              Export a complete snapshot of all devices, groups, automations, 3D spatial layouts, routines, palettes, and studio timelines. Import a previous backup to restore or migrate your configuration.
            </p>
          </div>

          {/* Export Row */}
          <div className={styles.backupRow}>
            <div className={styles.backupRowMeta}>
              <span className={styles.backupRowLabel}>Export Backup</span>
              <span className={styles.backupRowHint}>Downloads a timestamped JSON file containing all 17 database tables. Safe to run at any time and does not affect live data.</span>
            </div>
            <button
              type="button"
              className={styles.backupBtn}
              onClick={handleBackupExport}
              disabled={backupExporting}
              aria-label="Download full backup as JSON file"
            >
              {backupExporting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.backupSpinner}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Backup
                </>
              )}
            </button>
          </div>

          {/* Import Row */}
          <div className={styles.backupRow}>
            <div className={styles.backupRowMeta}>
              <span className={styles.backupRowLabel}>Restore from Backup</span>
              <span className={styles.backupRowHint}>Select a previously exported JSON backup file. You will be shown a preview of the backup version and record counts before any data is written.</span>
            </div>
            <button
              type="button"
              className={styles.backupBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={restoreState !== 'idle'}
              aria-label="Select backup file to restore"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Select Backup File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleRestoreFileSelect}
              aria-hidden="true"
            />
          </div>

          {/* Restore Preview Panel */}
          {restorePreview && restoreState === 'previewing' && (() => {
            const backupVer = restorePreview.schema_version || restorePreview.version || 'unknown'
            const currentVer = __APP_VERSION__
            const isOlderBackup = backupVer !== currentVer
            const counts = restorePreview.row_counts || {}
            return (
              <div className={styles.restorePreviewPanel}>
                <div className={styles.restorePreviewHeader}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Backup Preview</span>
                </div>

                <div className={styles.restoreVersionRow}>
                  <span className={styles.restoreVersionItem}>
                    <strong>Backup version:</strong> v{backupVer}
                  </span>
                  <span className={styles.restoreVersionItem}>
                    <strong>Current version:</strong> v{currentVer}
                  </span>
                  {isOlderBackup && (
                    <span className={styles.restoreVersionWarning}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      This backup is from v{backupVer} and you are running v{currentVer}. Features added since that version will not be in this backup and will remain empty after restore.
                    </span>
                  )}
                </div>

                {Object.keys(counts).length > 0 && (
                  <div className={styles.restoreCountGrid}>
                    {Object.entries(counts).map(([table, count]) => (
                      <div key={table} className={styles.restoreCountItem}>
                        <span className={styles.restoreCountValue}>{count}</span>
                        <span className={styles.restoreCountLabel}>{table.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.restoreModeRow}>
                  <span className={styles.restoreModeLabel}>Restore scope (uncheck to skip):</span>
                  <div className={styles.restoreModeOptions}>
                    {RESTORE_CATEGORIES.map((cat) => {
                      const catCount = cat.tables.reduce((n, t) => n + (counts[t] ?? 0), 0)
                      return (
                        <label key={cat.key} className={styles.restoreModeOption}>
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.key)}
                            onChange={() => toggleRestoreCategory(cat.key)}
                            aria-label={`Restore ${cat.label}`}
                          />
                          <div>
                            <strong>{cat.label} ({catCount})</strong>
                            <p>{cat.hint} Child records with missing parents are skipped automatically.</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {selectedCategories.length === 0 && (
                    <div className={styles.restoreReplaceWarning}>
                      <strong>Select at least one category to restore.</strong>
                    </div>
                  )}
                </div>

                <div className={styles.restoreModeRow}>
                  <span className={styles.restoreModeLabel}>Restore mode:</span>
                  <div className={styles.restoreModeOptions}>
                    <label className={styles.restoreModeOption}>
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                      />
                      <div>
                        <strong>Merge</strong>
                        <p>Add or update records from the backup without deleting existing data.</p>
                      </div>
                    </label>
                    <label className={styles.restoreModeOption}>
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === 'replace'}
                        onChange={() => { setRestoreMode('replace'); setShowReplaceConfirm(false) }}
                      />
                      <div>
                        <strong>Replace</strong>
                        <p>Clear all existing data first, then import the backup. This cannot be undone.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {restoreMode === 'replace' && !showReplaceConfirm && (
                  <div className={styles.restoreReplaceWarning}>
                    <strong>Replace mode will permanently erase {selectedCategories.length < ALL_RESTORE_CATEGORIES.length ? `current data in the selected categories (${selectedCategories.join(', ')})` : 'all current devices, groups, automations, spatial layouts, and studio content'} before restoring.</strong> Click Confirm Replace below to acknowledge this is intentional.
                  </div>
                )}

                <div className={styles.restoreActions}>
                  <button
                    type="button"
                    className={styles.backupBtnSecondary}
                    onClick={handleRestoreDismiss}
                  >
                    Cancel
                  </button>
                  {restoreMode === 'replace' && !showReplaceConfirm ? (
                    <button
                      type="button"
                      className={styles.backupBtnDanger}
                      onClick={() => setShowReplaceConfirm(true)}
                    >
                      Confirm Replace
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={restoreMode === 'replace' ? styles.backupBtnDanger : styles.backupBtn}
                      onClick={handleRestoreCommit}
                      disabled={restoreState === 'importing' || selectedCategories.length === 0}
                    >
                      {restoreState === 'importing' ? 'Restoring...' : (restoreMode === 'replace' ? 'Replace & Restore' : 'Merge & Restore')}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
        </section>

        {/* About */}
        <section className={styles.section} aria-labelledby="about-heading">
          <h2 id="about-heading" className={styles.sectionTitle}>About</h2>
          <div className={styles.aboutGrid}>
            <AboutRow label="Website" value={<a href="https://wledashboard.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>wledashboard.com</a>} />
            <AboutRow label="Version" value={`v${__APP_VERSION__}`} />
            <AboutRow label="Storage" value="Local SQLite (local-first, no cloud)" />
            <AboutRow label="License" value="All Rights Reserved (Copyright (c) 2026 Jasen Henry)" />
          </div>

          {/* Community & Special Thanks Infinite Marquee */}
          <div className={styles.specialThanksSection}>
            <div className={styles.specialThanksHeader}>
              <h3 className={styles.specialThanksTitle}>Community & Special Thanks</h3>
            </div>
            <p className={styles.specialThanksDesc}>
              Special thanks to community members whose feature requests, feedback, and bug reports help shape WLEDashboard. (Hover to pause)
            </p>
            <div className={styles.thanksMarqueeContainer}>
              <div className={styles.thanksMarqueeTrack}>
                {[...CONTRIBUTORS, ...CONTRIBUTORS].map((c, idx) => (
                  <div key={`${c.name}-${idx}`} className={styles.thanksRow}>
                    <span className={`${styles.platformIcon} ${c.platform === 'github' ? styles.platformIconGithub : styles.platformIconReddit}`}>
                      {c.platform === 'github' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-4.742 3.892a.342.342 0 0 0-.25.578c.67.662 1.64.992 2.242.992.602 0 1.572-.33 2.242-.992a.342.342 0 1 0-.482-.486c-.516.516-1.32.744-1.76.744-.44 0-1.244-.228-1.76-.744a.339.339 0 0 0-.232-.092z"/>
                        </svg>
                      )}
                    </span>
                    <span className={styles.thanksName}>
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* One-Time Unit Preference Modal */}
      {showUnitPromptModal && (
        <div className={styles.modalOverlay} onClick={() => handleSelectUnitPreference(null)}>
          <div className={styles.promptModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Location Updated</h3>
            <p className={styles.modalBody}>
              Would you like to set your room measurement units for 3D Spatial View based on your region preference?
            </p>
            <div className={styles.promptOptions}>
              <button
                type="button"
                className={styles.promptBtnPrimary}
                onClick={() => handleSelectUnitPreference('imperial')}
              >
                Imperial (Feet - ft)
              </button>
              <button
                type="button"
                className={styles.promptBtnPrimary}
                onClick={() => handleSelectUnitPreference('metric')}
              >
                Metric (Meters - m)
              </button>
            </div>
            <button
              type="button"
              className={styles.promptBtnSecondary}
              onClick={() => handleSelectUnitPreference(null)}
            >
              Keep Current Preference ({settings.unit_system === 'imperial' ? 'Imperial' : 'Metric'})
            </button>
          </div>
        </div>
      )}

      {/* Interactive Demo Mode Double Confirmation Modal */}
      {showDemoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDemoModal(false)}>
          <div className={styles.promptModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Enable Interactive Demo Mode?</h3>
            <div className={styles.demoNoticeBox}>
              <p className={styles.demoNoticeHighlight}>Physical devices are hidden but preserved.</p>
              <p className={styles.demoNoticeText}>
                Simulated virtual devices and a companion 3D spatial floorplan will be loaded so you can safely explore color controls, segments, presets, and spatial mapping without affecting your physical hardware.
              </p>
            </div>
            <p className={styles.modalBody}>
              No physical controllers or settings will be modified or deleted. You can return to your live setup at any time from General Settings or the top navigation banner.
            </p>
            <div className={styles.demoModalActions}>
              <button
                type="button"
                className={styles.promptBtnSecondary}
                onClick={() => setShowDemoModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.promptBtnPrimary}
                onClick={handleConfirmEnableDemo}
              >
                Enable Demo Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingField({ label, hint, id, children }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldMeta}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        {hint && <p className={styles.fieldHint}>{hint}</p>}
      </div>
      <div className={styles.fieldControl}>{children}</div>
    </div>
  )
}

function NumberInput({ id, value, onChange, onBlur, min, max, step, unit }) {
  return (
    <div className={styles.numberInput}>
      <input
        type="number"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        min={min}
        max={max}
        step={step}
        className={styles.numberInputField}
      />
      {unit && <span className={styles.unit}>{unit}</span>}
    </div>
  )
}

function TextInput({ id, value, onChange, onBlur, placeholder, type = "text" }) {
  return (
    <div className={styles.numberInput}>
      <input
        type={type}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={styles.numberInputField}
      />
    </div>
  )
}

function AboutRow({ label, value }) {
  return (
    <div className={styles.aboutRow}>
      <span className={styles.aboutLabel}>{label}</span>
      <span className={styles.aboutValue}>{value}</span>
    </div>
  )
}
