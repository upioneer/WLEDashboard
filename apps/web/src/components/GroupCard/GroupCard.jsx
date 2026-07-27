import { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSpringGroup } from '../../lib/spring.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { Toggle } from '../Toggle/Toggle.jsx'
import { Slider } from '../Slider/Slider.jsx'
import { ColorPickerCompact } from '../ColorPicker/ColorPickerCompact.jsx'
import { ContextMenu } from '../ContextMenu/ContextMenu.jsx'
import { pctToWledBri, wledBriToPct } from '../../lib/colors.js'
import styles from './GroupCard.module.css'

const DEBOUNCE_MS = 50

function useDebounce(fn, ms) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

const TYPE_LABELS = {
  zone: 'Zone',
  scene: 'Scene',
  sync: 'Sync',
  custom: 'Custom',
}

export function GroupCard({ group, onEdit }) {
  const sendGroupCommand = useGroupStore(s => s.sendGroupCommand)
  const removeGroup      = useGroupStore(s => s.removeGroup)
  const devices          = useDeviceStore(s => s.devices)
  const addToast         = useUIStore(s => s.addToast)

  const [contextMenu, setContextMenu] = useState(null)
  const [expanded, setExpanded]       = useState(false)

  // Resolve devices in this group
  const groupDevices = devices.filter(d => group.device_ids.includes(d.id))
  const onlineDevices = groupDevices.filter(d => d.is_online === 1)
  const activeDevices = onlineDevices.filter(d => d.liveState?.on)

  const isAnyOn = activeDevices.length > 0
  const isOnline = onlineDevices.length > 0

  // Calculate average brightness among online active devices
  const avgBriPct = activeDevices.length > 0
    ? Math.round(activeDevices.reduce((acc, d) => acc + wledBriToPct(d.liveState?.bri ?? 0), 0) / activeDevices.length)
    : 0

  const [localBri, setLocalBri] = useState(avgBriPct)
  const isDragging = useRef(false)

  useEffect(() => {
    if (!isDragging.current) {
      setLocalBri(avgBriPct)
    }
  }, [avgBriPct])

  const commitBrightness = useCallback((pct) => {
    isDragging.current = false
    const wledBri = pctToWledBri(pct)
    sendGroupCommand(group.id, {
      bri: wledBri,
      on: pct > 0,
      lor: 0,
      seg: [{ id: 0, bri: wledBri }],
    })
  }, [group.id, sendGroupCommand])

  const debouncedBrightness = useDebounce((pct) => {
    const wledBri = pctToWledBri(pct)
    sendGroupCommand(group.id, {
      bri: wledBri,
      on: pct > 0,
      lor: 0,
      seg: [{ id: 0, bri: wledBri }],
    })
  }, DEBOUNCE_MS)

  const handleBriChange = useCallback((pct) => {
    isDragging.current = true
    setLocalBri(pct)
    debouncedBrightness(pct)
  }, [debouncedBrightness])

  const [localColor, setLocalColor] = useState(group.color || '#8b5cf6')

  const commitColor = useCallback((hex) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    sendGroupCommand(group.id, { seg: [{ col: [[r, g, b]] }] })
  }, [group.id, sendGroupCommand])

  const debouncedColor = useDebounce(commitColor, DEBOUNCE_MS)

  const handleColorChange = useCallback((hex) => {
    setLocalColor(hex)
    debouncedColor(hex)
  }, [debouncedColor])

  const handlePowerToggle = useCallback((on) => {
    sendGroupCommand(group.id, { on })
  }, [group.id, sendGroupCommand])

  const handleDelete = useCallback(async () => {
    try {
      await removeGroup(group.id)
      addToast({ message: `Group "${group.name}" removed`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to remove group', type: 'error' })
    }
  }, [group.id, group.name, removeGroup, addToast])

  // Context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const contextItems = [
    {
      label: 'Edit Group',
      icon: <EditIcon />,
      onClick: () => onEdit?.(group),
    },
    { separator: true },
    {
      label: 'Delete Group',
      icon: <DeleteIcon />,
      onClick: handleDelete,
      danger: true,
    },
  ]

  // Hover spring
  const [cardVals, setCardVals] = useSpringGroup({ y: 0, shadowLevel: 0 }, 'responsive')

  return (
    <>
      <article
        className={styles.card}
        style={{
          transform: `translateY(${cardVals.y}px)`,
          boxShadow: cardVals.shadowLevel > 0.5 ? 'var(--shadow-3)' : 'var(--shadow-2)',
          '--group-accent': group.color || 'var(--accent-violet)',
        }}
        onMouseEnter={() => setCardVals({ y: -2, shadowLevel: 1 })}
        onMouseLeave={() => setCardVals({ y: 0, shadowLevel: 0 })}
        onContextMenu={handleContextMenu}
        aria-labelledby={`group-name-${group.id}`}
        data-group-id={group.id}
      >
        {/* Accent bar */}
        <div className={styles.accentBar} style={{ backgroundColor: group.color || 'var(--accent-violet)' }} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.identity}>
            <span id={`group-name-${group.id}`} className={styles.name}>
              {group.name}
            </span>
            <span className={styles.typeBadge}>
              {TYPE_LABELS[group.type] ?? 'Custom'}
            </span>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.menuBtn}
              onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
              aria-label="Group options"
            >
              <DotsIcon />
            </button>
            <Toggle
              id={`group-power-${group.id}`}
              checked={isAnyOn}
              onChange={handlePowerToggle}
              disabled={!isOnline}
            />
          </div>
        </div>

        {/* Device Stats summary */}
        <div className={styles.statsRow}>
          <span className={styles.statCount}>
            {onlineDevices.length} of {groupDevices.length} Online
          </span>
          {activeDevices.length > 0 && (
            <span className={styles.activeBadge}>{activeDevices.length} Active</span>
          )}
        </div>

        {/* Brightness */}
        <div className={styles.section}>
          <Slider
            id={`group-bri-${group.id}`}
            value={localBri}
            onChange={handleBriChange}
            onCommit={commitBrightness}
            color={group.color}
            label="Group Brightness"
          />
        </div>

        {/* Color Picker */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Group Color</p>
          <ColorPickerCompact
            value={localColor}
            onChange={handleColorChange}
            onCommit={commitColor}
          />
        </div>

        {/* Member devices list expander */}
        {groupDevices.length > 0 && (
          <div className={styles.membersSection}>
            <button
              className={styles.expandBtn}
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
            >
              <span>{expanded ? 'Hide Members' : `Show ${groupDevices.length} Members`}</span>
              <ChevronIcon rotated={expanded} />
            </button>

            {expanded && (
              <div className={styles.membersGrid}>
                {groupDevices.map(dev => (
                  <div key={dev.id} className={styles.memberChip}>
                    <span className={[styles.statusDot, dev.is_online ? styles.onlineDot : styles.offlineDot].join(' ')} />
                    <span className={styles.memberName}>{dev.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </article>

      {contextMenu && createPortal(
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={() => setContextMenu(null)}
        />,
        document.body
      )}
    </>
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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 10L9 3l2 2-7 7H2v-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
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

function ChevronIcon({ rotated }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ transform: rotated ? 'rotate(180deg)' : 'none', transition: 'transform 180ms var(--ease-out-expo)' }}
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
