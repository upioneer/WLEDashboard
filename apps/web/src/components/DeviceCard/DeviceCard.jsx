import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSpringGroup } from '../../lib/spring.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { isDeviceFirmwareOutdated } from '../../lib/firmware.js'
import {
  extractDominantColor,
  extractAllSegmentColors,
  wledBriToPct,
  pctToWledBri,
  briToGlow,
} from '../../lib/colors.js'
import { Toggle } from '../Toggle/Toggle.jsx'
import { Slider } from '../Slider/Slider.jsx'
import { ColorPickerCompact } from '../ColorPicker/ColorPickerCompact.jsx'
import { ContextMenu } from '../ContextMenu/ContextMenu.jsx'
import { IpChip } from '../IpChip/IpChip.jsx'
import { copyToClipboard } from '../../lib/clipboard.js'
import styles from './DeviceCard.module.css'

const DEBOUNCE_MS = 50

function useDebounce(fn, ms) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

export function DeviceCard({ device, isManualSort, dragAttributes, dragListeners, dragRef }) {
  const sendCommand  = useDeviceStore(s => s.sendCommand)
  const refreshDevice = useDeviceStore(s => s.refreshDevice)
  const removeDevice = useDeviceStore(s => s.removeDevice)
  const updateDevice = useDeviceStore(s => s.updateDevice)
  const uploadFirmware = useDeviceStore(s => s.uploadFirmware)
  const latestFirmwareVersion = useDeviceStore(s => s.latestFirmwareVersion)
  const addToast     = useUIStore(s => s.addToast)
  const isDemoModeStore = useUIStore(s => s.demoMode)
  const isDemoMode   = isDemoModeStore || device.id?.startsWith('demo-')

  const [contextMenu, setContextMenu] = useState(null)  // { x, y }
  const [renaming, setRenaming]       = useState(false)
  const [isUpdatingFirmware, setIsUpdatingFirmware] = useState(false)
  const [showSimulateFirmwareModal, setShowSimulateFirmwareModal] = useState(false)
  const [renameVal, setRenameVal]     = useState(device.name)
  const renameRef = useRef(null)

  const [editingChip, setEditingChip] = useState(null) // 'effect', 'led_count', 'led_density'
  const [chipEditVal, setChipEditVal] = useState('')

  const liveState     = device.liveState ?? {}
  const isOnline      = device.is_online === 1
  const isFirmwareOutdated = isDeviceFirmwareOutdated(device, latestFirmwareVersion)

  const fileInputRef = useRef(null)
  const isOn          = liveState.on ?? false
  const bri           = liveState.bri ?? 0
  const briPct        = wledBriToPct(bri)
  const dominantColor = extractDominantColor(liveState)
  const segments      = extractAllSegmentColors(liveState)
  const effectIndex   = liveState.seg?.[0]?.fx ?? null
  const effectName    = liveState.info?.fxcount
    ? (effectIndex !== null ? `Effect ${effectIndex}` : 'No effect')
    : (effectIndex !== null ? `Effect ${effectIndex}` : 'Solid')

  // Card hover spring
  const [cardVals, setCardVals] = useSpringGroup({ y: 0, shadowLevel: 0 }, 'responsive')

  const handleMouseEnter = useCallback(() => {
    if (!isOnline) return
    setCardVals({ y: -2, shadowLevel: 1 })
  }, [isOnline, setCardVals])

  const handleMouseLeave = useCallback(() => {
    setCardVals({ y: 0, shadowLevel: 0 })
  }, [setCardVals])

  // Power
  const handlePowerToggle = useCallback((on) => {
    if (on && (bri <= 0 || bri < 13)) {
      sendCommand(device.id, { on: true, bri: 128, lor: 0, seg: [{ id: 0, bri: 128 }] })
    } else {
      sendCommand(device.id, { on, lor: 0 })
    }
  }, [device.id, bri, sendCommand])

  // Brightness
  const [localBri, setLocalBri] = useState(briPct)
  const localBriRef = useRef(briPct)
  const isDragging  = useRef(false)

  useEffect(() => {
    if (!isDragging.current && Math.abs(briPct - localBriRef.current) > 2) {
      localBriRef.current = briPct
      setLocalBri(briPct)
    }
  }, [briPct])

  const commitBrightness = useCallback((pct) => {
    isDragging.current = false
    const wledBri = pctToWledBri(pct)
    sendCommand(device.id, {
      bri: wledBri,
      on: pct > 0,
      lor: 0,
      seg: [{ id: 0, bri: wledBri }],
    })
  }, [device.id, sendCommand])

  const debouncedBrightness = useDebounce((pct) => {
    const wledBri = pctToWledBri(pct)
    sendCommand(device.id, {
      bri: wledBri,
      on: pct > 0,
      lor: 0,
      seg: [{ id: 0, bri: wledBri }],
    })
  }, DEBOUNCE_MS)

  const handleBriChange = useCallback((pct) => {
    isDragging.current = true
    setLocalBri(pct)
    localBriRef.current = pct
    debouncedBrightness(pct)
  }, [debouncedBrightness])

  // Color
  const [localColor, setLocalColor] = useState(dominantColor ?? '#ff8844')

  useEffect(() => {
    if (dominantColor) setLocalColor(dominantColor)
  }, [dominantColor])

  const commitColor = useCallback((hex) => {
    if (!hex || hex.length < 7) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    sendCommand(device.id, {
      seg: [{ id: 0, col: [[r, g, b]] }],
      lor: 0,
    })
  }, [device.id, sendCommand])

  // Context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Delete
  const handleDelete = useCallback(async () => {
    try {
      await removeDevice(device.id)
      addToast({ message: `"${device.name}" removed`, type: 'info' })
    } catch {
      addToast({ message: 'Failed to remove device', type: 'error' })
    }
  }, [device.id, device.name, removeDevice, addToast])

  // Identify / Ping controller with pulse animation
  const [isIdentifying, setIsIdentifying] = useState(false)
  const identifyTimerRef = useRef(null)
  const savedStateRef    = useRef(null)

  const stopIdentify = useCallback(() => {
    if (identifyTimerRef.current) {
      clearTimeout(identifyTimerRef.current)
      identifyTimerRef.current = null
    }
    setIsIdentifying(false)
    if (savedStateRef.current) {
      const snap = savedStateRef.current
      savedStateRef.current = null
      sendCommand(device.id, {
        on: snap.on ?? true,
        bri: snap.bri ?? 128,
        seg: snap.seg ? snap.seg.map(s => ({ id: s.id ?? 0, fx: s.fx ?? 0, col: s.col, sx: s.sx, ix: s.ix })) : [{ id: 0, fx: 0 }],
      })
    }
  }, [device.id, sendCommand])

  const handleIdentify = useCallback(() => {
    if (isIdentifying) {
      stopIdentify()
      addToast({ message: `Stopped identifying "${device.name}"`, type: 'info' })
      return
    }

    savedStateRef.current = device.liveState
      ? JSON.parse(JSON.stringify(device.liveState))
      : { on: isOn, bri: pctToWledBri(localBri) }

    setIsIdentifying(true)

    sendCommand(device.id, {
      on: true,
      bri: 255,
      seg: [{ fx: 2, col: [[255, 180, 0]], sx: 220, ix: 255 }],
    })
    addToast({ message: `Identifying "${device.name}" (breathing gold pulse)...`, type: 'info', duration: 4000 })

    identifyTimerRef.current = setTimeout(() => {
      stopIdentify()
    }, 5000)
  }, [isIdentifying, stopIdentify, device.id, device.name, device.liveState, isOn, localBri, sendCommand, addToast])

  useEffect(() => {
    return () => {
      if (identifyTimerRef.current) clearTimeout(identifyTimerRef.current)
    }
  }, [])

  // Rename
  const startRename = useCallback(() => {
    setRenameVal(device.name)
    setRenaming(true)
    setTimeout(() => renameRef.current?.select(), 30)
  }, [device.name])

  const commitRename = useCallback(async () => {
    setRenaming(false)
    const trimmed = renameVal.trim()
    if (!trimmed || trimmed === device.name) {
      setRenameVal(device.name)
      return
    }
    try {
      await updateDevice(device.id, { name: trimmed })
      addToast({ message: 'Device renamed', type: 'success' })
    } catch {
      setRenameVal(device.name)
      addToast({ message: 'Failed to rename device', type: 'error' })
    }
  }, [renameVal, device.id, device.name, updateDevice, addToast])

  // Quick Action Chips
  const startChipEdit = (chip, initialVal) => {
    if (!isOnline) return
    setEditingChip(chip)
    setChipEditVal(initialVal)
  }

  const commitChipEdit = async (e) => {
    e.preventDefault()
    const chip = editingChip
    setEditingChip(null)
    
    if (!chipEditVal.trim()) return
    
    try {
      if (chip === 'led_count') {
        await updateDevice(device.id, { led_count: parseInt(chipEditVal, 10) })
        addToast({ message: 'LED count updated', type: 'success' })
      } else if (chip === 'led_density') {
        await updateDevice(device.id, { led_density: parseInt(chipEditVal, 10) })
        addToast({ message: 'LED density updated', type: 'success' })
      } else if (chip === 'effect') {
        const fxIndex = parseInt(chipEditVal, 10)
        if (!isNaN(fxIndex)) {
          await sendCommand(device.id, { seg: [{ id: 0, fx: fxIndex }] })
          addToast({ message: `Effect updated to ${fxIndex}`, type: 'success' })
        }
      }
    } catch (err) {
      addToast({ message: `Failed to update ${chip}: ${err.message}`, type: 'error' })
    }
  }

  useEffect(() => {
    if (!renaming) return
    const handleKey = (e) => {
      if (e.key === 'Escape') { setRenaming(false); setRenameVal(device.name) }
      if (e.key === 'Enter')  commitRename()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [renaming, device.name, commitRename])

  // Open in New Tab
  const handleOpenInNewTab = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    window.open(`http://${device.ip_address}`, '_blank', 'noopener,noreferrer')
  }, [device.ip_address])

  // Copy IP
  const handleCopyIP = useCallback(async (e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    const success = await copyToClipboard(device.ip_address)
    if (success) {
      addToast({ message: `Copied ${device.ip_address}`, type: 'info', duration: 2000 })
    } else {
      addToast({ message: `Failed to copy ${device.ip_address}`, type: 'error', duration: 3000 })
    }
  }, [device.ip_address, addToast])

  // Restart Controller
  const handleRestart = useCallback(async () => {
    try {
      await sendCommand(device.id, { rb: true })
      addToast({ message: `Restarting "${device.name}"...`, type: 'info', duration: 5000 })
    } catch (err) {
      addToast({ message: `Failed to restart "${device.name}": ${err.message}`, type: 'error' })
    }
  }, [device.id, device.name, sendCommand, addToast])

  // Force a live state read, bypassing cache
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await refreshDevice(device.id)
      addToast({ message: `Refreshed "${device.name}"`, type: 'success' })
    } catch {
      addToast({ message: `Could not reach "${device.name}"`, type: 'error' })
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, refreshDevice, device.id, device.name, addToast])

  // Firmware Update with Dual-Route Fallback
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUpdatingFirmware(true)
      addToast({ message: `Uploading firmware to ${device.name}, please wait...`, type: 'info', duration: 15000 })
      
      let uploadSuccess = false
      let successMessage = ''
      let proxyError = null

      // Route 1: Upload via backend proxy (/api/devices/:id/firmware)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadFirmware(device.id, formData)
        uploadSuccess = true
        successMessage = result?.message || `${device.name} firmware updated successfully! Device is rebooting.`
      } catch (err) {
        proxyError = err
      }

      // Route 2: Dual-Route Direct Browser Fallback (bypasses Docker/subnet proxy restrictions)
      if (!uploadSuccess) {
        const isMixedContent = window.location.protocol === 'https:'
        if (!isMixedContent && device.ip_address) {
          try {
            addToast({
              message: `Proxy update failed (${proxyError?.message || 'subnet restriction'}). Attempting direct browser connection to ${device.ip_address}...`,
              type: 'info',
              duration: 8000,
            })

            const directFd = new FormData()
            directFd.append('update', file)
            directFd.append('file', file)

            const directRes = await fetch(`http://${device.ip_address}/update`, {
              method: 'POST',
              body: directFd,
              signal: AbortSignal.timeout(120000),
            })

            const directText = await directRes.text().catch(() => '')
            const cleanText = directText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

            if (!directRes.ok || cleanText.toLowerCase().includes('failed')) {
              throw new Error(cleanText || directRes.statusText || 'Direct upload rejected by device')
            }

            uploadSuccess = true
            successMessage = `${device.name} firmware updated directly! Device is rebooting.`
          } catch (directErr) {
            throw new Error(`Proxy error: ${proxyError?.message || 'Server upload failed'}. Direct error: ${directErr.message}`)
          }
        } else {
          throw proxyError || new Error('Firmware upload failed')
        }
      }

      addToast({ message: successMessage, type: 'success', duration: 10000 })
    } catch (err) {
      addToast({
        message: `Firmware upload failed for ${device.name}: ${err.message}`,
        type: 'error',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setIsUpdatingFirmware(false)
    }
  }

  const handleConfirmSimulatedUpdate = useCallback(async () => {
    setShowSimulateFirmwareModal(false)
    setIsUpdatingFirmware(true)
    const targetVer = latestFirmwareVersion || '0.15.0'
    addToast({
      message: `[Demo Mode] Simulating OTA firmware flash for "${device.name}" to v${targetVer}...`,
      type: 'info',
      duration: 4000,
    })

    setTimeout(async () => {
      try {
        await updateDevice(device.id, { firmware_ver: targetVer })
        await useDeviceStore.getState().fetchDevices()
        addToast({
          message: `[Demo Mode] "${device.name}" firmware updated to v${targetVer} (Simulated). Device rebooted.`,
          type: 'success',
          duration: 6000,
        })
      } catch (err) {
        addToast({
          message: `Simulated update failed: ${err.message}`,
          type: 'error',
        })
      } finally {
        setIsUpdatingFirmware(false)
      }
    }, 2500)
  }, [device.id, device.name, latestFirmwareVersion, updateDevice, addToast])

  const handleUpdateFirmware = useCallback(() => {
    if (!isOnline) {
      addToast({ message: `Cannot update firmware: "${device.name}" is offline.`, type: 'error' })
      return
    }
    if (isDemoMode) {
      setShowSimulateFirmwareModal(true)
      return
    }
    fileInputRef.current?.click()
  }, [isOnline, isDemoMode, device.name, addToast])

  const isFavorite = useUIStore(s => s.favorites.includes(device.id))
  const toggleFavorite = useUIStore(s => s.toggleFavorite)

  const contextItems = [
    {
      label: isFavorite ? 'Unpin from Favorites' : 'Pin to Favorites',
      icon: <StarIcon filled={isFavorite} />,
      onClick: () => toggleFavorite(device.id),
    },
    { separator: true },
    {
      label: 'Rename',
      icon: <RenameIcon />,
      onClick: startRename,
    },
    {
      label: isIdentifying ? 'Stop Identify' : 'Identify',
      icon: <IdentifyIcon />,
      onClick: handleIdentify,
      disabled: !isOnline,
    },
    {
      label: 'Open Web UI',
      icon: <ExternalLinkIcon />,
      onClick: handleOpenInNewTab,
    },
    {
      label: 'Copy IP',
      icon: <CopyIcon />,
      onClick: handleCopyIP,
    },
    {
      label: isRefreshing ? 'Refreshing...' : 'Refresh State',
      icon: <RefreshIcon />,
      onClick: handleRefresh,
      disabled: !isOnline || isRefreshing,
    },
    {
      label: 'Restart Controller',
      icon: <RestartIcon />,
      onClick: handleRestart,
      disabled: !isOnline,
    },
    {
      label: isFirmwareOutdated ? 'Update Firmware (New!)' : 'Update Firmware',
      icon: <UpdateIcon />,
      onClick: handleUpdateFirmware,
      disabled: !isOnline,
    },
    { separator: true },
    {
      label: 'Remove Device',
      icon: <DeleteIcon />,
      onClick: handleDelete,
      danger: true,
    },
  ]

  // Card shadow with dynamic glow
  const cardStyle = {
    transform: `translateY(${cardVals.y}px)`,
    boxShadow: [
      cardVals.shadowLevel > 0.5 ? 'var(--shadow-3)' : 'var(--shadow-2)',
      isOn && dominantColor ? `0 0 32px -4px ${dominantColor}55` : null,
    ].filter(Boolean).join(', '),
  }

  const statusDotClass = !isOnline ? styles.offlineDot : isOn ? styles.onlineDot : styles.standbyDot

  return (
    <>
      <article
        ref={dragRef}
        className={[styles.card, !isOnline && styles.cardOffline, isIdentifying && styles.identifyingPulse].filter(Boolean).join(' ')}
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        aria-label={`${device.name}, ${isOnline ? (isOn ? 'On' : 'Off') : 'Offline'}`}
      >
        {/* Top bar: Drag handle, Name, Status dot, Firmware version, Options button, Power toggle */}
        <div className={styles.topBar}>
          {isManualSort ? (
            <button
              className={styles.dragHandle}
              {...dragAttributes}
              {...dragListeners}
              aria-label={`Reorder ${device.name}`}
              title="Drag to reorder"
            >
              <DragIcon />
            </button>
          ) : (
            <div className={styles.dragPlaceholder} />
          )}

          <div className={styles.nameGroup}>
            {renaming ? (
              <input
                ref={renameRef}
                className={styles.renameInput}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={commitRename}
                maxLength={64}
                aria-label="Device name"
              />
            ) : (
              <h2
                className={styles.name}
                onDoubleClick={startRename}
                title="Double-click to rename"
              >
                {device.name}
              </h2>
            )}
            <span
              className={[styles.statusDot, statusDotClass].filter(Boolean).join(' ')}
              title={isOnline ? (isOn ? 'Online, On' : 'Online, Standby') : 'Offline'}
              aria-label={isOnline ? (isOn ? 'Online, On' : 'Online, Standby') : 'Offline'}
            />
            {(device.firmware_ver || device.liveState?.info?.ver) && (
              <span
                className={[styles.version, isFirmwareOutdated && styles.versionOutdated].filter(Boolean).join(' ')}
                title={isFirmwareOutdated ? `Update available (latest: v${latestFirmwareVersion}) - Click to update` : `Firmware v${device.firmware_ver || device.liveState?.info?.ver}`}
                onClick={isFirmwareOutdated ? (e) => { e.stopPropagation(); handleUpdateFirmware(); } : undefined}
                style={isFirmwareOutdated ? { cursor: 'pointer' } : undefined}
                role={isFirmwareOutdated ? 'button' : undefined}
                tabIndex={isFirmwareOutdated ? 0 : undefined}
                onKeyDown={isFirmwareOutdated ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleUpdateFirmware(); } } : undefined}
              >
                v{String(device.firmware_ver || device.liveState?.info?.ver).replace(/^v/i, '')}
                {isFirmwareOutdated && <WarningTriangleIcon />}
              </span>
            )}
          </div>

          <div className={styles.topActions}>
            <button
              className={styles.optionsBtn}
              onClick={(e) => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                setContextMenu({ x: rect.right, y: rect.bottom + 4 })
              }}
              aria-label={`Options for ${device.name}`}
              title="Device options"
            >
              <DotsIcon />
            </button>

            <Toggle
              id={`power-${device.id}`}
              checked={isOn}
              disabled={!isOnline}
              onChange={handlePowerToggle}
              color={dominantColor}
            />
          </div>
        </div>

        {/* Live visual preview strip */}
        <div className={styles.previewStrip} aria-hidden>
          {segments.length > 1 ? (
            <div className={styles.multiSegmentStrip}>
              {segments.map((c, i) => (
                <div
                  key={i}
                  className={styles.stripSegment}
                  style={{
                    backgroundColor: isOn ? (c.color || c) : 'var(--surface-input)',
                    boxShadow: isOn ? briToGlow(bri, c.color || c) : 'none',
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className={styles.singleStrip}
              style={{
                backgroundColor: isOn && dominantColor ? dominantColor : 'var(--surface-input)',
                boxShadow: isOn && dominantColor ? briToGlow(bri, dominantColor) : 'none',
              }}
            />
          )}
        </div>

        {/* Sliders: Brightness + Color */}
        <div className={styles.controls}>
          <div className={styles.sliderRow}>
            <Slider
              id={`bri-${device.id}`}
              value={localBri}
              min={0}
              max={100}
              step={1}
              disabled={!isOnline || !isOn}
              label="Brightness"
              unit="%"
              color={dominantColor}
              onChange={handleBriChange}
              onCommit={commitBrightness}
            />
          </div>

          <div className={styles.colorRow}>
            <ColorPickerCompact
              color={localColor}
              disabled={!isOnline || !isOn}
              onChange={setLocalColor}
              onCommit={commitColor}
            />
          </div>
        </div>

        {/* Metadata & Actions Chicklets: 2 dedicated static rows */}
        <div className={styles.footer}>
          {/* Row 1: Hardware Specs (Left) & Sync/Weather Action Chips (Right) */}
          <div className={styles.chickletRow}>
            <div className={styles.hardwareGroup}>
              {device.led_count ? (
                <span 
                  className={[
                    styles.chip, 
                    isOnline ? styles.editableChip : styles.chipDisabled, 
                    !device.led_density && styles.singleHardwareChip
                  ].filter(Boolean).join(' ')} 
                  title={isOnline ? "Click to edit LED count" : `${device.led_count} LEDs (Device unreachable)`}
                  onClick={isOnline ? () => startChipEdit('led_count', device.led_count) : undefined}
                  aria-disabled={!isOnline}
                >
                  {device.led_count} LEDs
                </span>
              ) : null}

              {device.led_density ? (
                <span 
                  className={[
                    styles.chip, 
                    isOnline ? styles.editableChip : styles.chipDisabled, 
                    styles.densityChip
                  ].filter(Boolean).join(' ')} 
                  title={isOnline ? "Click to edit LED density" : `${device.led_density}/m (Device unreachable)`}
                  onClick={isOnline ? () => startChipEdit('led_density', device.led_density) : undefined}
                  aria-disabled={!isOnline}
                >
                  {device.led_density}/m
                </span>
              ) : null}
            </div>

            {/* Static right-aligned Action Chicklets (width-locked for symmetry) */}
            <div className={styles.actionGroup}>
              <button
                className={[styles.chip, styles.actionChip, !isOnline && styles.chipDisabled].filter(Boolean).join(' ')}
                disabled={!isOnline}
                style={device.spotify_sync_enabled ? { backgroundColor: 'var(--accent-emerald)', color: '#000' } : {}}
                onClick={async () => {
                  if (!isOnline) return
                  const nextSync = device.spotify_sync_enabled ? 0 : 1
                  try {
                    await updateDevice(device.id, { spotify_sync_enabled: nextSync })
                    addToast({ message: `Spotify Sync ${nextSync ? 'Enabled' : 'Disabled'}`, type: 'success' })
                  } catch (err) {
                    addToast({ message: 'Failed to update Spotify sync', type: 'error' })
                  }
                }}
                title={isOnline ? "Toggle Spotify Sync" : "Device unreachable"}
                aria-disabled={!isOnline}
              >
                Sync
              </button>

              <button
                className={[styles.chip, styles.actionChip, !isOnline && styles.chipDisabled].filter(Boolean).join(' ')}
                disabled={!isOnline}
                style={device.weather_sync_enabled ? { backgroundColor: 'var(--accent-cyan)', color: '#000' } : {}}
                onClick={async () => {
                  if (!isOnline) return
                  const nextWeather = device.weather_sync_enabled ? 0 : 1
                  try {
                    await updateDevice(device.id, { weather_sync_enabled: nextWeather })
                    addToast({ message: `Weather Sync ${nextWeather ? 'Enabled' : 'Disabled'}`, type: 'success' })
                  } catch (err) {
                    addToast({ message: 'Failed to update Weather sync', type: 'error' })
                  }
                }}
                title={isOnline ? "Toggle Weather Sync" : "Device unreachable"}
                aria-disabled={!isOnline}
              >
                Weather
              </button>
            </div>
          </div>

          {/* Row 2: Lighting State Effect (Left) & Network IP Chicklet (Right) */}
          <div className={styles.chickletRow}>
            <div className={styles.effectGroup}>
              {effectName && (
                <span 
                  className={[
                    styles.chip, 
                    styles.effectChip, 
                    isOnline ? styles.editableChip : styles.chipDisabled
                  ].filter(Boolean).join(' ')} 
                  title={isOnline ? `Click to edit effect: ${effectName}` : `${effectName} (Device unreachable)`}
                  onClick={isOnline ? () => startChipEdit('effect', effectIndex ?? 0) : undefined}
                  aria-disabled={!isOnline}
                >
                  {effectName}
                </span>
              )}
            </div>

            {/* Static right-aligned IP Chicklet (width-locked for symmetry) */}
            <div className={styles.ipGroup}>
              <IpChip ip={device.ip_address} align="right" className={styles.cardIpChip} disabled={!isOnline} />
            </div>
          </div>
        </div>

        {/* Offline overlay */}
        {!isOnline && !isUpdatingFirmware && (
          <div className={styles.offlineOverlay} aria-hidden>
            <span>Unreachable</span>
          </div>
        )}

        {/* Updating overlay */}
        {isUpdatingFirmware && (
          <div className={styles.offlineOverlay} aria-hidden style={{ backdropFilter: 'blur(4px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <SpinnerIcon />
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Updating Firmware...</span>
            </div>
          </div>
        )}
      </article>

      {/* Context menu rendered in a portal to avoid stacking context issues */}
      {contextMenu && createPortal(
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={closeContextMenu}
        />,
        document.body
      )}

      {/* Quick Edit Chip Modal */}
      {editingChip && createPortal(
        <div className={styles.chipModalOverlay} onClick={() => setEditingChip(null)}>
          <div className={styles.chipModal} onClick={e => e.stopPropagation()}>
            <h4>Edit {editingChip.replace('_', ' ')}</h4>
            <form onSubmit={commitChipEdit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {editingChip === 'led_density' ? (
                <select
                  autoFocus
                  className={styles.chipInput}
                  value={chipEditVal}
                  onChange={e => setChipEditVal(e.target.value)}
                >
                  <option value="30">30 LEDs/m</option>
                  <option value="60">60 LEDs/m</option>
                  <option value="96">96 LEDs/m</option>
                  <option value="144">144 LEDs/m</option>
                </select>
              ) : (
                <input
                  type="number"
                  autoFocus
                  className={styles.chipInput}
                  value={chipEditVal}
                  onChange={e => setChipEditVal(e.target.value)}
                  placeholder={editingChip === 'effect' ? 'Effect ID (0-117)' : ''}
                />
              )}
              <button type="submit" className={styles.chipSaveBtn}>Save</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Simulated Firmware Update Modal (Demo Mode) */}
      {showSimulateFirmwareModal && createPortal(
        <div className={styles.chipModalOverlay} onClick={() => setShowSimulateFirmwareModal(false)}>
          <div className={styles.chipModal} onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Simulate Firmware Update</h4>
            <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Interactive Demo Simulation
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Simulate flashing upstream WLED <strong>v{latestFirmwareVersion || '0.15.0'}</strong> to <strong>{device.name}</strong>. Virtual controller state will be updated in memory without affecting physical hardware.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              <span>Current: <strong style={{ color: 'var(--text-primary)' }}>v{String(device.firmware_ver || device.liveState?.info?.ver || '0.14.0').replace(/^v/i, '')}</strong></span>
              <span>Target: <strong style={{ color: 'var(--color-success, #10b981)' }}>v{String(latestFirmwareVersion || '0.15.0').replace(/^v/i, '')}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className={styles.chipSaveBtn}
                style={{ background: 'var(--surface-3, #2d3348)', color: 'var(--text-primary)' }}
                onClick={() => setShowSimulateFirmwareModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.chipSaveBtn}
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', fontWeight: 600 }}
                onClick={handleConfirmSimulatedUpdate}
              >
                Simulate Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden File Input for Firmware Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".bin" 
        onChange={handleFileChange} 
      />
    </>
  )
}

// ─── Card Icons ───────────────────────────────────────────────────────────────

function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.2" />
      <circle cx="4" cy="7" r="1.2" />
      <circle cx="4" cy="11" r="1.2" />
      <circle cx="10" cy="3" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="10" cy="11" r="1.2" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    </svg>
  )
}

function WarningTriangleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function UpdateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
    </svg>
  )
}

function RenameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 10L9 3l2 2-7 7H2v-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function IdentifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 10V2.5A1.5 1.5 0 013.5 1H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="1,3 2.5,3 13,3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4.5 3V2a1 1 0 011-1h3a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 3l.7 9a1 1 0 001 .9h5.6a1 1 0 001-.9l.7-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function StarIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
