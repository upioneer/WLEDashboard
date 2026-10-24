import { useState, useEffect, useCallback } from 'react'
import { useStripStore } from '../../stores/stripStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { sortedByName } from '../../lib/sort.js'
import { hexToRgb } from '../../lib/colors.js'
import { STRIP_PATTERNS } from '../../lib/stripPatterns.js'
import { lengthOf, deviceMax, clampMemberToMax, validateMemberRange, displayRange } from '../../lib/stripRanges.js'
import { stripsApi, devicesApi } from '../../lib/api.js'
import styles from './VirtualStrips.module.css'

export const STRIP_LIMITS = { leds: 1500, members: 8 }

function emptyMember() {
  return { device_id: '', offset: 0, length: 30, reverse: false }
}

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 6h9M8.5 3.5 11 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10H5M7.5 7.5 5 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VirtualStrips() {
  const strips = useStripStore(s => s.strips)
  const fetchStrips = useStripStore(s => s.fetchStrips)
  const addStrip = useStripStore(s => s.addStrip)
  const removeStrip = useStripStore(s => s.removeStrip)
  const playStrip = useStripStore(s => s.playStrip)
  const stopStrip = useStripStore(s => s.stopStrip)
  const devices = useDeviceStore(s => s.devices)
  const fetchDevices = useDeviceStore(s => s.fetchDevices)
  const addToast = useUIStore(s => s.addToast)

  const [name, setName] = useState('')
  const [members, setMembers] = useState([emptyMember()])
  const [autoResume, setAutoResume] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [transport, setTransport] = useState({})
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    fetchStrips()
    fetchDevices()
  }, [fetchStrips, fetchDevices])

  const playingIds = strips.filter(s => s.playing).map(s => s.id).join(',')
  useEffect(() => {
    if (!playingIds) return
    let cancelled = false
    const poll = async () => {
      for (const id of playingIds.split(',')) {
        try {
          const status = await stripsApi.status(id)
          if (!cancelled) setStatuses(prev => ({ ...prev, [id]: status }))
        } catch {}
      }
    }
    poll()
    const timer = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [playingIds])

  const deviceById = useCallback((id) => devices.find(d => d.id === id), [devices])
  const maxFor = useCallback((member) => {
    if (!member.device_id) return null
    return deviceMax(deviceById(member.device_id))
  }, [deviceById, devices])

  const totalLeds = members.reduce((sum, m) => sum + (Number(m.length) || 0), 0)
  const valid = name.trim().length > 0
    && members.length > 0
    && members.length <= STRIP_LIMITS.members
    && totalLeds <= STRIP_LIMITS.leds
    && members.every(m => m.device_id && validateMemberRange(m, maxFor(m)) === null)
    && new Set(members.map(m => m.device_id)).size === members.length

  const handleDeviceSelect = useCallback((idx, deviceId) => {
    setMembers(prev => prev.map((m, i) => {
      if (i !== idx) return m
      const next = { ...m, device_id: deviceId }
      const max = deviceId ? deviceMax(deviceById(deviceId)) : null
      if (max == null) return next
      return { ...next, ...clampMemberToMax(next, max) }
    }))
  }, [deviceById])

  // Canonical edge setters. The Start/End inputs show traversal order, so a
  // reversed member wires Start to the high edge and End to the low edge.
  const setLowEdge = useCallback((idx, value) => {
    setMembers(prev => prev.map((m, i) => {
      if (i !== idx) return m
      const max = m.device_id ? deviceMax(deviceById(m.device_id)) : null
      let offset = Number(value)
      if (!Number.isInteger(offset)) return { ...m, offset: value }
      offset = Math.max(offset, 0)
      if (max != null) offset = Math.min(offset, max - 1)
      const length = max != null
        ? Math.min(Math.max(Number(m.length) || 1, 1), Math.max(max - offset, 1))
        : m.length
      return { ...m, offset, length }
    }))
  }, [deviceById])

  const setHighEdge = useCallback((idx, value) => {
    setMembers(prev => prev.map((m, i) => {
      if (i !== idx) return m
      const max = m.device_id ? deviceMax(deviceById(m.device_id)) : null
      let end = Number(value)
      if (!Number.isInteger(end)) return m
      const offset = Math.max(Number(m.offset) || 0, 0)
      if (max != null) end = Math.min(Math.max(end, offset), max - 1)
      const length = Math.max(lengthOf(offset, end), 1)
      return { ...m, offset, length }
    }))
  }, [deviceById])

  const handleSwap = useCallback((idx) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, reverse: !m.reverse } : m))
  }, [])

  const handleSyncCounts = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const out = await devicesApi.syncLedCounts()
      await fetchDevices()
      if (out.failed === 0) {
        addToast({ message: `LED counts synced: ${out.updated} updated, ${out.unchanged} unchanged`, type: 'success' })
      } else {
        addToast({ message: `LED sync finished with ${out.failed} failure${out.failed === 1 ? '' : 's'}`, type: 'error' })
      }
    } catch (err) {
      addToast({ message: `LED sync failed: ${err.message}`, type: 'error' })
    } finally {
      setSyncing(false)
    }
  }, [syncing, fetchDevices, addToast])

  const handleCreate = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      await addStrip({
        name: name.trim(),
        members: members.map(m => ({
          device_id: m.device_id,
          offset: Number(m.offset),
          length: Number(m.length),
          reverse: !!m.reverse,
        })),
        auto_resume: autoResume,
      })
      setName('')
      setMembers([emptyMember()])
      setAutoResume(false)
      addToast({ message: 'Virtual strip created', type: 'success' })
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await removeStrip(id)
      addToast({ message: 'Virtual strip deleted', type: 'success' })
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    }
  }

  const transportFor = (id) => transport[id] ?? { pattern: 'chase', color: '#8b5cf6', speed: 128 }
  const setTransportFor = (id, patch) => {
    setTransport(prev => ({ ...prev, [id]: { ...transportFor(id), ...patch } }))
  }

  const handlePlay = async (id) => {
    const t = transportFor(id)
    try {
      await playStrip(id, {
        pattern: t.pattern,
        params: { color1: hexToRgb(t.color), speed: Number(t.speed) || 128, direction: 1 },
      })
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    }
  }

  const handleStop = async (id) => {
    try {
      await stopStrip(id)
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    }
  }

  const deviceName = (id) => devices.find(d => d.id === id)?.name ?? 'Unknown device'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>New Virtual Strip</h3>
        <p className={styles.cardDesc}>
          Stack members in physical order below. Start and End are hard
          bookended by each device's LED count, synced from firmware or
          entered per device in Device Manager. The swap button reverses
          travel direction through a member. Each device can appear in a
          strip only once.
        </p>
        <div className={styles.builderRow}>
          <label className={styles.fieldLabel}>
            Name
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Hallway Run"
              maxLength={64}
              className={styles.textInput}
            />
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={autoResume}
              onChange={e => setAutoResume(e.target.checked)}
              className={styles.checkbox}
            />
            Auto resume on server restart
          </label>
        </div>
        {members.map((m, i) => {
          const max = maxFor(m)
          const rangeError = m.device_id ? validateMemberRange(m, max) : null
          const edgesOk = Number.isInteger(Number(m.offset)) && Number.isInteger(Number(m.length))
          const disp = edgesOk
            ? displayRange({ offset: Number(m.offset), length: Number(m.length), reverse: m.reverse })
            : { start: '', end: '' }
          const lowEdge = Number(m.offset) || 0
          return (
            <div key={i} className={styles.memberRow}>
              <span className={styles.memberIndex}>{i + 1}</span>
              <select
                value={m.device_id}
                onChange={e => handleDeviceSelect(i, e.target.value)}
                className={styles.selectInput}
                aria-label={`Member ${i + 1} device`}
              >
                <option value="">Select device...</option>
                {sortedByName(devices).map(d => {
                  const taken = d.id !== m.device_id && members.some((x, j) => j !== i && x.device_id === d.id)
                  return (
                    <option key={d.id} value={d.id} disabled={taken}>
                      {d.name}{deviceMax(d) != null ? ` (${deviceMax(d)} LEDs)` : ''}{taken ? ' (added)' : ''}
                    </option>
                  )
                })}
              </select>
              <label className={styles.numLabel}>
                Start
                <input
                  type="number"
                  min={m.reverse ? lowEdge : 0}
                  max={max != null ? max - 1 : undefined}
                  value={disp.start}
                  onChange={e => (m.reverse ? setHighEdge : setLowEdge)(i, e.target.value)}
                  className={styles.numInput}
                  aria-label={`Member ${i + 1} start LED`}
                />
              </label>
              <button
                type="button"
                className={[styles.swapBtn, m.reverse && styles.swapBtnActive].filter(Boolean).join(' ')}
                onClick={() => handleSwap(i)}
                title={m.reverse ? 'Traveling high to low; click for low to high' : 'Traveling low to high; click to reverse'}
                aria-label={`Member ${i + 1} swap direction`}
                aria-pressed={!!m.reverse}
              >
                <SwapIcon />
              </button>
              <label className={styles.numLabel}>
                End
                <input
                  type="number"
                  min={m.reverse ? 0 : lowEdge}
                  max={max != null ? max - 1 : undefined}
                  value={disp.end}
                  onChange={e => (m.reverse ? setLowEdge : setHighEdge)(i, e.target.value)}
                  className={styles.numInput}
                  aria-label={`Member ${i + 1} end LED`}
                />
              </label>
              {m.device_id && (
                max != null
                  ? <span className={styles.maxBadge}>of {max}</span>
                  : (
                    <span
                      className={[styles.maxBadge, styles.maxUnknown].join(' ')}
                      title="Sync LED counts or set this device's LED count in Device Manager"
                    >
                      max unknown
                    </span>
                  )
              )}
              {rangeError && <span className={styles.rangeError} role="alert">{rangeError}</span>}
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setMembers(prev => prev.filter((_, j) => j !== i))}
                disabled={members.length <= 1}
                title="Remove member"
              >
                Remove
              </button>
            </div>
          )
        })}
        <div className={styles.builderFooter}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setMembers(prev => [...prev, emptyMember()])}
            disabled={members.length >= STRIP_LIMITS.members}
          >
            + Add Member
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleSyncCounts}
            disabled={syncing}
            title="Pull configured LED counts from all controllers"
          >
            {syncing ? 'Syncing...' : 'Sync LED Counts'}
          </button>
          <span className={styles.totalBadge}>
            {totalLeds} / {STRIP_LIMITS.leds} LEDs
          </span>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleCreate}
            disabled={!valid || saving}
          >
            {saving ? 'Creating...' : 'Create Strip'}
          </button>
        </div>
      </div>

      {strips.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.cardDesc}>No virtual strips yet. Build one above to get started.</p>
        </div>
      ) : (
        sortedByName(strips).map(s => {
          const t = transportFor(s.id)
          const status = statuses[s.id]
          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.stripHeader}>
                <span className={[styles.dot, s.playing ? styles.dotOn : styles.dotOff].join(' ')} />
                <h3 className={styles.cardTitle}>{s.name}</h3>
                <span className={styles.stripMeta}>
                  {s.total_leds} LEDs • {s.members.length} member{s.members.length === 1 ? '' : 's'}
                  {s.playing && status ? ` • ${status.fps} fps` : ''}
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleDelete(s.id)}
                  title="Delete strip"
                >
                  Delete
                </button>
              </div>
              <ul className={styles.memberList}>
                {s.members.map((m, i) => {
                  const health = status?.members?.find(h => h.device_id === m.device_id)
                  const travel = displayRange(m)
                  return (
                    <li key={i} className={styles.memberItem}>
                      <span className={styles.memberIndex}>{i + 1}</span>
                      <span className={styles.memberName}>{deviceName(m.device_id)}</span>
                      <span className={styles.memberRange}>
                        LEDs {travel.start} to {travel.end}{m.reverse ? ' (reversed)' : ''}
                      </span>
                      {s.playing && health && (
                        <span className={[styles.healthBadge, health.ok ? styles.healthOk : styles.healthBad].join(' ')}>
                          {health.ok ? 'Live' : 'Unreachable'}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className={styles.transportRow}>
                <select
                  value={t.pattern}
                  onChange={e => setTransportFor(s.id, { pattern: e.target.value })}
                  className={styles.selectInput}
                  aria-label="Pattern"
                >
                  {STRIP_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <input
                  type="color"
                  value={t.color}
                  onChange={e => setTransportFor(s.id, { color: e.target.value })}
                  className={styles.colorInput}
                  aria-label="Pattern color"
                />
                <label className={styles.numLabel}>
                  Speed
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={t.speed}
                    onChange={e => setTransportFor(s.id, { speed: e.target.value })}
                    className={styles.numInput}
                  />
                </label>
                {s.playing ? (
                  <button type="button" className={styles.stopBtn} onClick={() => handleStop(s.id)}>
                    Stop
                  </button>
                ) : (
                  <button type="button" className={styles.primaryBtn} onClick={() => handlePlay(s.id)}>
                    Play
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
