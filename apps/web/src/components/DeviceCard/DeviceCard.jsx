import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSpringGroup } from '../../lib/spring.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
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
import styles from './DeviceCard.module.css'

const DEBOUNCE_MS = 50

function useDebounce(fn, ms) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

export function DeviceCard({ device }) {
  const sendCommand  = useDeviceStore(s => s.sendCommand)
  const removeDevice = useDeviceStore(s => s.removeDevice)
  const updateDevice = useDeviceStore(s => s.updateDevice)
  const uploadFirmware = useDeviceStore(s => s.uploadFirmware)
  const latestFirmwareVersion = useDeviceStore(s => s.latestFirmwareVersion)
  const addToast     = useUIStore(s => s.addToast)

  const [contextMenu, setContextMenu] = useState(null)  // { x, y }
  const [renaming, setRenaming]       = useState(false)
  const [isUpdatingFirmware, setIsUpdatingFirmware] = useState(false)
  const [renameVal, setRenameVal]     = useState(device.name)
  const renameRef = useRef(null)

  const [editingChip, setEditingChip] = useState(null) // 'effect', 'led_count', 'led_density'
  const [chipEditVal, setChipEditVal] = useState('')

  const liveState     = device.liveState ?? {}
  const isOnline      = device.is_online === 1
  const isFirmwareOutdated = device.firmware_ver && latestFirmwareVersion && device.firmware_ver !== latestFirmwareVersion

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
      on: true,
      lor: 0,
      seg: [{ id: 0, fx: 0, col: [[r, g, b], [0, 0, 0], [0, 0, 0]] }],
    })
  }, [device.id, sendCommand])

  const debouncedColor = useDebounce(commitColor, DEBOUNCE_MS)

  const handleColorChange = useCallback((hex) => {
    setLocalColor(hex)
    debouncedColor(hex)
  }, [debouncedColor])

  // Context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Delete
  const handleDelete = useCallback(async () => {
    try {
      await removeDevice(device.id)
      addToast({ message: `"${device.name}" removed`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to remove device', type: 'error' })
    }
  }, [device.id, device.name, removeDevice, addToast])

  // Identify (breathing pulse & full state snapshot restoration)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const savedStateRef = useRef(null)
  const identifyTimerRef = useRef(null)

  const stopIdentify = useCallback(() => {
    if (identifyTimerRef.current) {
      clearTimeout(identifyTimerRef.current)
      identifyTimerRef.current = null
    }
    setIsIdentifying(false)
    if (savedStateRef.current) {
      const saved = savedStateRef.current
      sendCommand(device.id, {
        on: saved.on ?? true,
        bri: saved.bri ?? 255,
        seg: saved.seg ?? [{ fx: 0 }],
      })
      savedStateRef.current = null
    }
  }, [device.id, sendCommand])

  const handleIdentify = useCallback(() => {
    if (isIdentifying) {
      stopIdentify()
      addToast({ message: `Stopped identifying "${device.name}"`, type: 'info', duration: 2000 })
      return
    }

    // Save full WLED state snapshot before identifying
    savedStateRef.current = device.liveState
      ? JSON.parse(JSON.stringify(device.liveState))
      : { on: isOn, bri: pctToWledBri(localBri) }

    setIsIdentifying(true)

    // Vibrant breathing gold pulse effect (fx: 2 = Breathe, vibrant amber/gold color)
    sendCommand(device.id, {
      on: true,
      bri: 255,
      seg: [{ fx: 2, col: [[255, 180, 0]], sx: 220, ix: 255 }],
    })
    addToast({ message: `Identifying "${device.name}" (breathing gold pulse)...`, type: 'info', duration: 4000 })

    // Auto-restore after 5 seconds if not manually toggled off
    identifyTimerRef.current = setTimeout(() => {
      stopIdentify()
    }, 5000)
  }, [isIdentifying, stopIdentify, device.id, device.name, device.liveState, isOn, localBri, sendCommand, addToast])

  // Cleanup identify timer on unmount
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

  // Document-level Escape handler while rename is active
  // (input onKeyDown alone is unreliable if focus races with the setTimeout)
  useEffect(() => {
    if (!renaming) return
    const handleKey = (e) => {
      if (e.key === 'Escape') { setRenaming(false); setRenameVal(device.name) }
      if (e.key === 'Enter')  commitRename()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [renaming, device.name, commitRename])

  // Copy IP
  const handleCopyIP = useCallback(() => {
    navigator.clipboard?.writeText(device.ip_address)
    addToast({ message: `Copied ${device.ip_address}`, type: 'info', duration: 2000 })
  }, [device.ip_address, addToast])

  // Firmware Update
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUpdatingFirmware(true)
      addToast({ message: `Uploading firmware to ${device.name}, please wait...`, type: 'info' })
      
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadFirmware(device.id, formData)
      
      addToast({ message: result?.message || `${device.name} firmware updated successfully! Device is rebooting.`, type: 'success', duration: 8000 })
    } catch (err) {
      addToast({ message: `Firmware upload failed for ${device.name}: ${err.message}`, type: 'error' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setIsUpdatingFirmware(false)
    }
  }

  const handleUpdateFirmware = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const contextItems = [
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
      label: 'Copy IP',
      icon: <CopyIcon />,
      onClick: handleCopyIP,
    },
    {
      label: isFirmwareOutdated ? 'Update Firmware (New!)' : 'Update Firmware',
      icon: <UpdateIcon />,
      onClick: handleUpdateFirmware,
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

  const statusClass = !isOnline ? styles.offline : isOn ? styles.online : styles.standby

  return (
    <>
      <article
        className={[styles.card, !isOnline && styles.cardOffline, isIdentifying && styles.cardIdentifying].filter(Boolean).join(' ')}
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        aria-labelledby={`device-name-${device.id}`}
        data-device-id={device.id}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.identity}>
            <span
              className={[styles.statusDot, statusClass].join(' ')}
              aria-label={!isOnline ? 'Offline' : isOn ? 'On' : 'Standby'}
            />
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
              <span
                id={`device-name-${device.id}`}
                className={styles.name}
                title={device.name}
                onDoubleClick={startRename}
              >
                {device.name}
              </span>
            )}
            {device.firmware_ver && (
              <span className={styles.version} style={isFirmwareOutdated ? { color: 'var(--accent-amber)', fontWeight: 600 } : undefined}>
                v{device.firmware_ver} {isFirmwareOutdated ? '⚠️' : ''}
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            {isIdentifying && (
              <button
                className={styles.identifyingBadge}
                onClick={stopIdentify}
                title="Click to stop identifying"
              >
                Breathing... ✕
              </button>
            )}
            <button
              className={styles.menuBtn}
              onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
              aria-label="Device options"
              title="Options"
            >
              <DotsIcon />
            </button>
            <Toggle
              id={`power-${device.id}`}
              checked={isOn}
              onChange={handlePowerToggle}
              disabled={!isOnline}
            />
          </div>
        </div>

        {/* Brightness */}
        <div className={styles.section}>
          <Slider
            id={`bri-${device.id}`}
            value={localBri}
            onChange={handleBriChange}
            onCommit={commitBrightness}
            color={dominantColor}
            label="Brightness"
          />
        </div>

        {/* Color */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Color</p>
          <ColorPickerCompact
            value={localColor || '#ff8844'}
            onChange={handleColorChange}
            onCommit={commitColor}
          />
        </div>

        {/* Meta chips */}
        <div className={styles.chips}>
          <button 
            className={[styles.chip, styles.actionChip].join(' ')} 
            onClick={() => startChipEdit('effect', effectIndex ?? 0)}
            title="Edit Effect ID"
          >
            {effectName}
          </button>
          
          <button 
            className={[styles.chip, styles.actionChip].join(' ')} 
            onClick={() => startChipEdit('led_count', device.led_count || liveState?.info?.leds?.count || '')}
            title="Edit LED Count"
          >
            {device.led_count || liveState?.info?.leds?.count || '?'} LEDs
          </button>

          <button 
            className={[styles.chip, styles.actionChip].join(' ')} 
            onClick={() => startChipEdit('led_density', device.led_density || 60)}
            title="Edit LED Density (LEDs/m)"
          >
            {device.led_density || 60}/m
          </button>

          <button
            className={[styles.chip, styles.ipChip].join(' ')}
            onClick={handleCopyIP}
            title="Click to copy IP"
          >
            {device.ip_address}
          </button>
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

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
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
