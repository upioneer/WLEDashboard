import { useState, useEffect } from 'react'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import styles from './ScheduleEditorModal.module.css'

const TRIGGER_TYPES = [
  { value: 'time',    label: 'Fixed Time',  desc: 'Specific time of day (HH:MM)' },
  { value: 'sunrise', label: 'Sunrise',     desc: 'Astronomical sunrise' },
  { value: 'sunset',  label: 'Sunset',      desc: 'Astronomical sunset' },
]

export function ScheduleEditorModal({ schedule = null, onClose, onSave }) {
  const devices = useDeviceStore(s => s.devices)
  const groups  = useGroupStore(s => s.groups)

  const [name, setName]                   = useState(schedule?.name ?? '')
  const [triggerType, setTriggerType]     = useState(schedule?.trigger_type ?? 'time')
  const [triggerValue, setTriggerValue]   = useState(schedule?.trigger_value ?? '19:00')
  const [targetType, setTargetType]       = useState(schedule?.target_type ?? 'device')
  const [targetId, setTargetId]           = useState(schedule?.target_id ?? (devices[0]?.id || ''))
  const [actionPower, setActionPower]     = useState(schedule?.payload?.on ?? true)
  const [actionBri, setActionBri]         = useState(schedule?.payload?.bri ?? 255)
  const [enabled, setEnabled]             = useState(schedule?.enabled ?? true)
  const [saving, setSaving]               = useState(false)

  // Update default targetId when devices/groups load
  useEffect(() => {
    if (!targetId) {
      if (targetType === 'device' && devices[0]) setTargetId(devices[0].id)
      if (targetType === 'group'  && groups[0])  setTargetId(groups[0].id)
    }
  }, [targetType, devices, groups, targetId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !targetId) return
    setSaving(true)

    try {
      await onSave({
        name: name.trim(),
        trigger_type: triggerType,
        trigger_value: triggerValue,
        target_type: targetType,
        target_id: targetId,
        payload: { on: actionPower, bri: actionBri },
        enabled,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

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
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name & Enabled */}
          <div className={styles.row}>
            <label className={styles.fieldLabel}>
              Schedule Name <span className={styles.required}>*</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sunset Porch Lights"
                maxLength={64}
                className={styles.textInput}
                required
                autoFocus
              />
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className={styles.checkbox}
              />
              Enable Schedule
            </label>
          </div>

          {/* Trigger Selection */}
          <div className={styles.fieldLabel}>
            Trigger Type
            <div className={styles.triggerSelector}>
              {TRIGGER_TYPES.map(tt => (
                <button
                  type="button"
                  key={tt.value}
                  className={[styles.triggerBtn, triggerType === tt.value && styles.triggerBtnActive].filter(Boolean).join(' ')}
                  onClick={() => setTriggerType(tt.value)}
                >
                  {tt.label}
                </button>
              ))}
            </div>
          </div>

          {triggerType === 'time' && (
            <label className={styles.fieldLabel}>
              Time (24h format)
              <input
                type="time"
                value={triggerValue}
                onChange={e => setTriggerValue(e.target.value)}
                className={styles.textInput}
                required
              />
            </label>
          )}

          {/* Target Selection */}
          <div className={styles.row}>
            <div className={styles.fieldLabel}>
              Target Type
              <select
                value={targetType}
                onChange={e => {
                  setTargetType(e.target.value)
                  if (e.target.value === 'device') setTargetId(devices[0]?.id || '')
                  if (e.target.value === 'group')  setTargetId(groups[0]?.id || '')
                }}
                className={styles.selectInput}
              >
                <option value="device">Single Device</option>
                <option value="group">Group / Zone</option>
              </select>
            </div>

            <div className={styles.fieldLabel}>
              Target
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className={styles.selectInput}
                required
              >
                {targetType === 'device' ? (
                  devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>)
                ) : (
                  groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.type})</option>)
                )}
              </select>
            </div>
          </div>

          {/* Action Settings */}
          <div className={styles.fieldLabel}>
            Action State
            <div className={styles.actionRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={actionPower}
                  onChange={e => setActionPower(e.target.checked)}
                  className={styles.checkbox}
                />
                Power On
              </label>

              {actionPower && (
                <div className={styles.briRow}>
                  <span>Brightness: {Math.round(actionBri / 255 * 100)}%</span>
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={actionBri}
                    onChange={e => setActionBri(Number(e.target.value))}
                    className={styles.rangeInput}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveSubmitBtn}
              disabled={saving || !name.trim() || !targetId}
              aria-busy={saving}
            >
              {saving ? 'Saving...' : schedule ? 'Save Schedule' : 'Create Schedule'}
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
