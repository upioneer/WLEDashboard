import { useState, useEffect, useCallback } from 'react'
import { settingsApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import { LocationMapPicker } from '../../components/LocationMapPicker/LocationMapPicker.jsx'
import styles from './Settings.module.css'

import { useAutomationStore } from '../../stores/automationStore.js'

const DEFAULTS = {
  poll_interval_ms: '5000',
  mdns_scan_interval_ms: '30000',
  latitude: '37.7749',
  longitude: '-122.4194',
  unit_system: 'imperial',
  unit_prompt_shown: 'false',
}

export function Settings() {
  const addToast = useUIStore(s => s.addToast)
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [showUnitPromptModal, setShowUnitPromptModal] = useState(false)

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettings({ ...DEFAULTS, ...s })
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      addToast({ message: 'Failed to load settings', type: 'error' })
    })
  }, [])

  const handleChange = useCallback((key, value) => {
    setSettings(s => ({ ...s, [key]: value }))
  }, [])

  const handleLocationChange = useCallback((lat, lng) => {
    setSettings(s => {
      const next = { ...s, latitude: String(lat), longitude: String(lng) }
      if (s.unit_prompt_shown !== 'true') {
        setShowUnitPromptModal(true)
      }
      return next
    })
  }, [])

  const handleSelectUnitPreference = useCallback(async (choice) => {
    const updated = {
      ...settings,
      unit_prompt_shown: 'true',
    }
    if (choice) updated.unit_system = choice

    setSettings(updated)
    setShowUnitPromptModal(false)

    try {
      await settingsApi.update(updated)
      addToast({ message: choice ? `Unit system set to ${choice}` : 'Location saved', type: 'success' })
    } catch {
      addToast({ message: 'Failed to update settings', type: 'error' })
    }
  }, [settings, addToast])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await settingsApi.update(settings)
      await useAutomationStore.getState().fetchSunTimes()
      addToast({ message: 'Settings saved and units updated', type: 'success' })
    } catch {
      addToast({ message: 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [settings, addToast])

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
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

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
                  onClick={() => handleChange('unit_system', 'imperial')}
                >
                  Imperial (ft)
                </button>
                <button
                  type="button"
                  className={[styles.unitToggleBtn, settings.unit_system === 'metric' && styles.unitToggleActive].filter(Boolean).join(' ')}
                  onClick={() => handleChange('unit_system', 'metric')}
                >
                  Metric (m)
                </button>
              </div>
            </SettingField>
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
                onChange={v => handleChange('poll_interval_ms', v)}
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
                onChange={v => handleChange('mdns_scan_interval_ms', v)}
                min={5000}
                max={300000}
                step={5000}
                unit="ms"
              />
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
            onChange={(lat, lng) => handleLocationChange(lat, lng)}
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
                onChange={v => handleLocationChange(v, settings.longitude)}
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
                onChange={v => handleLocationChange(settings.latitude, v)}
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
                      handleLocationChange(lat, lng)
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

        {/* About */}
        <section className={styles.section} aria-labelledby="about-heading">
          <h2 id="about-heading" className={styles.sectionTitle}>About</h2>
          <div className={styles.aboutGrid}>
            <AboutRow label="Version" value="0.4.0" />
            <AboutRow label="Storage" value="Local SQLite (local-first, no cloud)" />
            <AboutRow label="License" value="All Rights Reserved (Copyright (c) 2026 Jasen Henry)" />
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

function NumberInput({ id, value, onChange, min, max, step, unit }) {
  return (
    <div className={styles.numberInput}>
      <input
        type="number"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        className={styles.numberInputField}
      />
      {unit && <span className={styles.unit}>{unit}</span>}
    </div>
  )
}

function TextInput({ id, value, onChange, placeholder }) {
  return (
    <div className={styles.numberInput}>
      <input
        type="text"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
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
