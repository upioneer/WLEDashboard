import { useState, useCallback, useRef } from 'react'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './DeviceManager.module.css'

export function DeviceManager() {
  const { devices, addDevice, removeDevice, updateDevice } = useDeviceStore()
  const addToast = useUIStore(s => s.addToast)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [confirming, setConfirming]   = useState(null) // id pending delete confirm

  return (
    <main className={styles.page} id="main-content">
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Device Manager</h1>
          <p className={styles.subtitle}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => setShowAddForm(v => !v)}
          aria-expanded={showAddForm}
        >
          {showAddForm ? 'Cancel' : 'Add Device'}
        </button>
      </header>

      {showAddForm && (
        <AddDeviceForm
          onAdd={async (data) => {
            try {
              await addDevice(data)
              addToast({ message: `"${data.name}" added`, type: 'success' })
              setShowAddForm(false)
            } catch (err) {
              addToast({ message: err.message ?? 'Failed to add device', type: 'error' })
            }
          }}
        />
      )}

      <section className={styles.list} aria-label="Registered devices">
        {devices.length === 0 ? (
          <div className={styles.emptyRow}>No devices registered yet.</div>
        ) : (
          devices.map(device => (
            <DeviceRow
              key={device.id}
              device={device}
              isEditing={editingId === device.id}
              isConfirming={confirming === device.id}
              onEdit={() => setEditingId(device.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={async (data) => {
                try {
                  await updateDevice(device.id, data)
                  addToast({ message: 'Device updated', type: 'success' })
                  setEditingId(null)
                } catch {
                  addToast({ message: 'Failed to update device', type: 'error' })
                }
              }}
              onDeleteRequest={() => setConfirming(device.id)}
              onDeleteConfirm={async () => {
                try {
                  await removeDevice(device.id)
                  addToast({ message: `"${device.name}" removed`, type: 'success' })
                } catch {
                  addToast({ message: 'Failed to remove device', type: 'error' })
                } finally {
                  setConfirming(null)
                }
              }}
              onDeleteCancel={() => setConfirming(null)}
            />
          ))
        )}
      </section>
    </main>
  )
}

// ─── Device Row ───────────────────────────────────────────────────────────────

function DeviceRow({
  device, isEditing, isConfirming,
  onEdit, onCancelEdit, onSave,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}) {
  const [name, setName]   = useState(device.name)
  const [ip, setIp]       = useState(device.ip_address)
  const [leds, setLeds]   = useState(device.led_count ?? '')

  const isOnline = device.is_online === 1

  if (isConfirming) {
    return (
      <div className={[styles.row, styles.rowConfirm].join(' ')} role="alert">
        <span className={styles.confirmMsg}>
          Remove <strong>{device.name}</strong>? This cannot be undone.
        </span>
        <div className={styles.rowActions}>
          <button className={styles.dangerBtn} onClick={onDeleteConfirm}>Remove</button>
          <button className={styles.ghostBtn} onClick={onDeleteCancel}>Cancel</button>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className={[styles.row, styles.rowEditing].join(' ')}>
        <div className={styles.editFields}>
          <label className={styles.editLabel}>
            Name
            <input
              className={styles.editInput}
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
              autoFocus
            />
          </label>
          <label className={styles.editLabel}>
            IP Address
            <input
              className={styles.editInput}
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="192.168.1.x"
            />
          </label>
          <label className={styles.editLabel}>
            LED Count
            <input
              className={styles.editInput}
              type="number"
              value={leds}
              onChange={e => setLeds(e.target.value)}
              min={1}
              max={9999}
              placeholder="e.g. 144"
            />
          </label>
        </div>
        <div className={styles.rowActions}>
          <button
            className={styles.saveBtn}
            onClick={() => onSave({ name: name.trim(), ip_address: ip.trim(), led_count: leds ? parseInt(leds) : undefined })}
            disabled={!name.trim() || !ip.trim()}
          >
            Save
          </button>
          <button className={styles.ghostBtn} onClick={onCancelEdit}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.row}>
      <div className={styles.rowStatus}>
        <span className={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline].join(' ')} />
      </div>
      <div className={styles.rowInfo}>
        <span className={styles.rowName}>{device.name}</span>
        <div className={styles.rowMeta}>
          <span className={styles.metaChip}>{device.ip_address}</span>
          {device.led_count && <span className={styles.metaChip}>{device.led_count} LEDs</span>}
          {device.firmware_ver && <span className={styles.metaChip}>v{device.firmware_ver}</span>}
          {device.mac_address && <span className={[styles.metaChip, styles.mac].join(' ')}>{device.mac_address}</span>}
        </div>
      </div>
      <div className={styles.rowActions}>
        <button className={styles.editBtn} onClick={onEdit} aria-label={`Edit ${device.name}`}>
          Edit
        </button>
        <button className={styles.deleteBtn} onClick={onDeleteRequest} aria-label={`Remove ${device.name}`}>
          Remove
        </button>
      </div>
    </div>
  )
}

// ─── Add Device Form ──────────────────────────────────────────────────────────

function AddDeviceForm({ onAdd }) {
  const [name, setName]     = useState('')
  const [ip, setIp]         = useState('')
  const [leds, setLeds]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !ip.trim()) return
    setLoading(true)
    await onAdd({
      name: name.trim(),
      ip_address: ip.trim(),
      led_count: leds ? parseInt(leds) : undefined,
    })
    setLoading(false)
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} aria-label="Add new device">
      <h2 className={styles.addFormTitle}>Register Device Manually</h2>
      <p className={styles.addFormHint}>
        WLED devices are discovered automatically via mDNS. Use this form to add a device by IP if auto-discovery is not available.
      </p>
      <div className={styles.addFields}>
        <label className={styles.editLabel}>
          Name <span className={styles.required}>*</span>
          <input
            className={styles.editInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Living Room Strip"
            maxLength={64}
            required
            autoFocus
          />
        </label>
        <label className={styles.editLabel}>
          IP Address <span className={styles.required}>*</span>
          <input
            className={styles.editInput}
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="192.168.1.x"
            pattern="^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"
            required
          />
        </label>
        <label className={styles.editLabel}>
          LED Count
          <input
            className={styles.editInput}
            type="number"
            value={leds}
            onChange={e => setLeds(e.target.value)}
            placeholder="e.g. 144 (auto-detected on first contact)"
            min={1}
            max={9999}
          />
        </label>
      </div>
      <div className={styles.addActions}>
        <button
          type="submit"
          className={styles.addSubmitBtn}
          disabled={loading || !name.trim() || !ip.trim()}
          aria-busy={loading}
        >
          {loading ? 'Adding...' : 'Add Device'}
        </button>
      </div>
    </form>
  )
}
