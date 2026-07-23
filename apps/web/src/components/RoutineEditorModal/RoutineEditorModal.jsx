import { useState, useEffect, useCallback } from 'react'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import styles from './RoutineEditorModal.module.css'

export function RoutineEditorModal({ routine = null, onClose, onSave }) {
  const devices = useDeviceStore(s => s.devices)
  const groups  = useGroupStore(s => s.groups)

  const [name, setName]               = useState(routine?.name ?? '')
  const [description, setDescription] = useState(routine?.description ?? '')
  const [steps, setSteps]             = useState(routine?.steps ?? [])
  const [enabled, setEnabled]         = useState(routine?.enabled ?? true)
  const [saving, setSaving]           = useState(false)

  const addStep = useCallback(() => {
    const defaultTarget = devices[0]?.id ? { target_type: 'device', target_id: devices[0].id } : { target_type: 'group', target_id: groups[0]?.id || '' }
    setSteps(prev => [
      ...prev,
      {
        target_type: defaultTarget.target_type,
        target_id: defaultTarget.target_id,
        payload: { on: true, bri: 255 },
        delay_ms: 0,
      },
    ])
  }, [devices, groups])

  const updateStep = useCallback((index, field, value) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }, [])

  const updateStepPayload = useCallback((index, payloadField, value) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, payload: { ...s.payload, [payloadField]: value } } : s))
  }, [])

  const removeStep = useCallback((index) => {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        steps,
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
            {routine ? 'Edit Routine Timeline' : 'Create Routine Timeline'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name & Enabled */}
          <div className={styles.row}>
            <label className={styles.fieldLabel}>
              Routine Name <span className={styles.required}>*</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Evening Wind Down"
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
              Active
            </label>
          </div>

          <label className={styles.fieldLabel}>
            Description
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Dims lights over 3 steps before shutoff"
              className={styles.textInput}
            />
          </label>

          {/* Steps Timeline Builder */}
          <div className={styles.fieldLabel}>
            <div className={styles.stepHeaderRow}>
              <span>Timeline Steps ({steps.length})</span>
              <button type="button" className={styles.addStepBtn} onClick={addStep}>
                + Add Step
              </button>
            </div>

            <div className={styles.stepsTimeline}>
              {steps.length === 0 ? (
                <div className={styles.emptySteps}>
                  No steps in timeline. Click "+ Add Step" to begin building a multi-step lighting routine.
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div key={idx} className={styles.stepCard}>
                    <div className={styles.stepBadge}>Step {idx + 1}</div>

                    <div className={styles.stepControls}>
                      <div className={styles.stepRow}>
                        <select
                          value={step.target_type}
                          onChange={e => {
                            const newType = e.target.value
                            const newId   = newType === 'device' ? (devices[0]?.id || '') : (groups[0]?.id || '')
                            updateStep(idx, 'target_type', newType)
                            updateStep(idx, 'target_id', newId)
                          }}
                          className={styles.selectInput}
                        >
                          <option value="device">Device</option>
                          <option value="group">Group</option>
                        </select>

                        <select
                          value={step.target_id}
                          onChange={e => updateStep(idx, 'target_id', e.target.value)}
                          className={styles.selectInput}
                        >
                          {step.target_type === 'device' ? (
                            devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                          ) : (
                            groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                          )}
                        </select>

                        <label className={styles.powerLabel}>
                          <input
                            type="checkbox"
                            checked={step.payload?.on ?? true}
                            onChange={e => updateStepPayload(idx, 'on', e.target.checked)}
                            className={styles.checkbox}
                          />
                          Power
                        </label>
                      </div>

                      <div className={styles.stepRow}>
                        <label className={styles.smallLabel}>
                          Delay Before Step (s)
                          <input
                            type="number"
                            min="0"
                            max="600"
                            value={Math.round((step.delay_ms || 0) / 1000)}
                            onChange={e => updateStep(idx, 'delay_ms', Math.max(0, Number(e.target.value) * 1000))}
                            className={styles.numInput}
                          />
                        </label>

                        {step.payload?.on && (
                          <label className={styles.smallLabel}>
                            Brightness ({Math.round((step.payload?.bri ?? 255) / 255 * 100)}%)
                            <input
                              type="range"
                              min="1"
                              max="255"
                              value={step.payload?.bri ?? 255}
                              onChange={e => updateStepPayload(idx, 'bri', Number(e.target.value))}
                              className={styles.rangeInput}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.removeStepBtn}
                      onClick={() => removeStep(idx)}
                      title="Remove step"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
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
              disabled={saving || !name.trim() || steps.length === 0}
              aria-busy={saving}
            >
              {saving ? 'Saving...' : routine ? 'Save Routine' : 'Create Routine'}
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="1,3 2.5,3 13,3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.5 3l.7 9a1 1 0 001 .9h5.6a1 1 0 001-.9l.7-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
