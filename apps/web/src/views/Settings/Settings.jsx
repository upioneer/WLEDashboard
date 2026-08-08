import { useState, useEffect, useCallback } from 'react'
import { settingsApi, mqttApi, spotifyApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import { LocationMapPicker } from '../../components/LocationMapPicker/LocationMapPicker.jsx'
import { useUpdateCheck } from '../../hooks/useUpdateCheck.js'
import styles from './Settings.module.css'

import { useAutomationStore } from '../../stores/automationStore.js'

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
}

export function Settings() {
  const addToast = useUIStore(s => s.addToast)
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [showUnitPromptModal, setShowUnitPromptModal] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [copiedSpotifyUri, setCopiedSpotifyUri] = useState(false)
  const { updateAvailable } = useUpdateCheck(__APP_VERSION__)

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      spotifyApi.getStatus().catch(() => ({ connected: false }))
    ]).then(([s, spot]) => {
      setSettings({ ...DEFAULTS, ...s })
      setSpotifyConnected(spot.connected)
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

      {updateAvailable && (
        <div className={styles.updateBanner}>
          <div className={styles.updateBannerText}>
            <h3>Update Available: v{updateAvailable}</h3>
            <p>A new version of WLEDashboard is available! Since you are running via Docker, you can update instantly without losing any data.</p>
          </div>
          <div className={styles.updateInstructions}>
            <p>Run the following command in your terminal:</p>
            <code>docker compose pull && docker compose up -d</code>
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
                  checked={settings.spatial_intro_enabled !== 'false'}
                  onChange={(e) => handleChange('spatial_intro_enabled', e.target.checked ? 'true' : 'false')}
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

        {/* Media Sync */}
        <section className={styles.section} aria-labelledby="media-heading">
          <h2 id="media-heading" className={styles.sectionTitle}>Media Sync</h2>
          <p className={styles.sectionDesc}>
            Connect your Spotify account to automatically extract album art colors and sync them to your WLED devices. Requires a <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>Spotify Developer App</a>.
          </p>
          <div style={{ background: '#12141d', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', border: '1px solid #2d3348' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Spotify Dashboard Setup</h4>
            <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.5' }}>
              <li style={{ marginBottom: '0.75rem' }}><strong>APIs/SDKs:</strong> Select <strong>Web API</strong>.</li>
              <li>
                <strong>Redirect URIs:</strong> Spotify strictly requires Redirect URIs to be secure (HTTPS) unless using <code>localhost</code>. 
                Copy and paste the exact URL below into your Spotify Developer dashboard:
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    readOnly 
                    value={(window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                      ? `${window.location.protocol}//${window.location.hostname}:3001/api/spotify/callback`
                      : `http://localhost:3001/api/spotify/callback`
                    }
                    style={{ flex: 1, background: '#1a1d29', border: '1px solid #2d3348', borderRadius: '4px', padding: '0.4rem 0.6rem', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const uri = (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                        ? `${window.location.protocol}//${window.location.hostname}:3001/api/spotify/callback`
                        : `http://localhost:3001/api/spotify/callback`
                      navigator.clipboard.writeText(uri)
                      setCopiedSpotifyUri(true)
                      setTimeout(() => setCopiedSpotifyUri(false), 2000)
                      addToast({ message: 'Redirect URI copied to clipboard!', type: 'success' })
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
                    <strong>Warning:</strong> You are accessing this dashboard via an insecure IP (<code>{window.location.hostname}</code>). Spotify will reject this IP. You must temporarily access the dashboard via <code>http://localhost:3001</code> (e.g. from the host machine or via SSH tunnel) to perform the initial Spotify connection, or set up a reverse proxy with HTTPS.
                  </div>
                )}
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
                onChange={v => handleChange('spotify_client_id', v)}
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
                onChange={v => handleChange('spotify_client_secret', v)}
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
                  href={`http://${window.location.hostname}:3001/api/spotify/login`}
                  className={styles.secondaryBtn}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => {
                    if (!settings.spotify_client_id || !settings.spotify_client_secret) {
                      e.preventDefault()
                      addToast({ message: 'Please save your Client ID and Secret first!', type: 'error' })
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
            Connect OpenWeatherMap to automatically reflect live weather conditions via WLED effects on your ambient lights. (e.g., pulsing blue for rain). Requires an API key from <a href="https://home.openweathermap.org/api_keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>OpenWeatherMap</a>.
          </p>
          <div className={styles.fields}>
            <SettingField
              label="OpenWeatherMap API Key"
              hint="Paste your free API key here to enable weather polling."
              id="openweathermap_api_key"
            >
              <TextInput
                id="openweathermap_api_key"
                value={settings.openweathermap_api_key || ''}
                onChange={v => handleChange('openweathermap_api_key', v)}
                placeholder="00000000000000000000000000000000"
              />
            </SettingField>
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
                onChange={e => handleChange('mqtt_enabled', e.target.value)}
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
                onChange={e => handleChange('mqtt_broker_url', e.target.value)}
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
            <AboutRow label="Website" value={<a href="https://wledashboard.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>wledashboard.com</a>} />
            <AboutRow label="Version" value={`v${__APP_VERSION__}`} />
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

function TextInput({ id, value, onChange, placeholder, type = "text" }) {
  return (
    <div className={styles.numberInput}>
      <input
        type={type}
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
