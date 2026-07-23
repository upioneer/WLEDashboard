import { useState, useCallback, useEffect } from 'react'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import styles from './GroupEditorModal.module.css'

const GROUP_TYPES = [
  { value: 'zone',   label: 'Zone',   desc: 'Physical room or lighting zone' },
  { value: 'scene',  label: 'Scene',  desc: 'Mood or preset scene group' },
  { value: 'sync',   label: 'Sync',   desc: 'Synchronized animation group' },
  { value: 'custom', label: 'Custom', desc: 'Custom collection of lights' },
]

const ACCENT_PRESETS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#ec4899', // Pink
]

export function GroupEditorModal({ group = null, onClose, onSave }) {
  const devices = useDeviceStore(s => s.devices)
  const groups  = useGroupStore(s => s.groups)

  const [name, setName]               = useState(group?.name ?? '')
  const [type, setType]               = useState(group?.type ?? 'zone')
  const [color, setColor]             = useState(group?.color ?? '#8b5cf6')
  const [selectedDevices, setSelectedDevices] = useState(group?.device_ids ?? [])
  const [selectedChildren, setSelectedChildren] = useState(group?.child_group_ids ?? [])
  const [saving, setSaving]           = useState(false)

  // Avoid self-nesting in child group selection
  const availableChildGroups = groups.filter(g => g.id !== group?.id)

  const toggleDevice = useCallback((devId) => {
    setSelectedDevices(prev =>
      prev.includes(devId) ? prev.filter(id => id !== devId) : [...prev, devId]
    )
  }, [])

  const toggleChildGroup = useCallback((gId) => {
    setSelectedChildren(prev =>
      prev.includes(gId) ? prev.filter(id => id !== gId) : [...prev, gId]
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    try {
      await onSave({
        name: name.trim(),
        type,
        color,
        device_ids: selectedDevices,
        child_group_ids: selectedChildren,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {group ? 'Edit Group' : 'Create Group'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name & Type */}
          <div className={styles.row}>
            <label className={styles.fieldLabel}>
              Group Name <span className={styles.required}>*</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Living Room Lights"
                maxLength={64}
                className={styles.textInput}
                required
                autoFocus
              />
            </label>

            <div className={styles.fieldLabel}>
              Group Type
              <div className={styles.typeSelector}>
                {GROUP_TYPES.map(gt => (
                  <button
                    type="button"
                    key={gt.value}
                    className={[styles.typeBtn, type === gt.value && styles.typeBtnActive].filter(Boolean).join(' ')}
                    onClick={() => setType(gt.value)}
                  >
                    {gt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className={styles.fieldLabel}>
            Accent Color
            <div className={styles.colorPalette}>
              {ACCENT_PRESETS.map(hex => (
                <button
                  type="button"
                  key={hex}
                  className={[styles.colorSwatch, color === hex && styles.colorSwatchActive].filter(Boolean).join(' ')}
                  style={{ backgroundColor: hex }}
                  onClick={() => setColor(hex)}
                  aria-label={`Select color ${hex}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className={styles.colorInput}
                title="Custom color"
              />
            </div>
          </div>

          {/* Member Devices Selection */}
          <div className={styles.fieldLabel}>
            Member Devices ({selectedDevices.length} selected)
            <div className={styles.selectionList}>
              {devices.length === 0 ? (
                <p className={styles.emptyHint}>No devices registered yet.</p>
              ) : (
                devices.map(dev => {
                  const isSelected = selectedDevices.includes(dev.id)
                  return (
                    <label
                      key={dev.id}
                      className={[styles.selectionItem, isSelected && styles.selectionItemActive].filter(Boolean).join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDevice(dev.id)}
                        className={styles.checkbox}
                      />
                      <span className={[styles.statusDot, dev.is_online ? styles.dotOnline : styles.dotOffline].join(' ')} />
                      <span className={styles.itemTitle}>{dev.name}</span>
                      <span className={styles.itemSub}>{dev.ip_address}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Nested Child Groups Selection */}
          {availableChildGroups.length > 0 && (
            <div className={styles.fieldLabel}>
              Nested Child Groups ({selectedChildren.length} selected)
              <div className={styles.selectionList}>
                {availableChildGroups.map(childG => {
                  const isSelected = selectedChildren.includes(childG.id)
                  return (
                    <label
                      key={childG.id}
                      className={[styles.selectionItem, isSelected && styles.selectionItemActive].filter(Boolean).join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChildGroup(childG.id)}
                        className={styles.checkbox}
                      />
                      <span className={styles.groupBadge} style={{ backgroundColor: childG.color }}>
                        {childG.type}
                      </span>
                      <span className={styles.itemTitle}>{childG.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveSubmitBtn}
              disabled={saving || !name.trim()}
              aria-busy={saving}
            >
              {saving ? 'Saving...' : group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
