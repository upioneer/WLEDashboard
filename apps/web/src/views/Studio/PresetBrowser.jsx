import { useState, useMemo, useRef } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { Slider } from '../../components/Slider/Slider.jsx'
import { sortedByName } from '../../lib/sort.js'
import { buildPreviewPayload } from '../../lib/commands.js'
import styles from './PresetBrowser.module.css'

const CATEGORIES = ['All', 'Basic', 'Dynamic', 'Fire', 'Festive', 'Nature']

function CardsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PresetBrowser() {
  const effects           = useStudioStore(s => s.effects)
  const paletteCatalog    = useStudioStore(s => s.paletteCatalog)
  const selectedEffectId  = useStudioStore(s => s.selectedEffectId)
  const selectedPaletteId = useStudioStore(s => s.selectedPaletteId)
  const speed             = useStudioStore(s => s.speed)
  const intensity         = useStudioStore(s => s.intensity)
  const previewColor      = useStudioStore(s => s.previewColor)
  const setEffect         = useStudioStore(s => s.setEffect)
  const setPalette        = useStudioStore(s => s.setPalette)
  const setSpeed          = useStudioStore(s => s.setSpeed)
  const setIntensity      = useStudioStore(s => s.setIntensity)
  const setPreviewColor   = useStudioStore(s => s.setPreviewColor)

  const devices       = useDeviceStore(s => s.devices)
  const groups        = useGroupStore(s => s.groups)
  const sendCommand   = useDeviceStore(s => s.sendCommand)
  const sendGroupCommand = useGroupStore(s => s.sendGroupCommand)
  const captureSandboxDevice = useStudioStore(s => s.captureSandboxDevice)
  const addToast      = useUIStore(s => s.addToast)

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery]       = useState('')
  const [viewMode, setViewMode]             = useState(() => {
    try {
      return localStorage.getItem('wled_studio_preset_view_mode') || 'cards'
    } catch {
      return 'cards'
    }
  })

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    try {
      localStorage.setItem('wled_studio_preset_view_mode', mode)
    } catch {}
  }

  const filteredEffects = useMemo(() => {
    return sortedByName(effects.filter(e => {
      const matchesCat = activeCategory === 'All' || e.category === activeCategory
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    }))
  }, [effects, activeCategory, searchQuery])

  const [targetKind, setTargetKind] = useState('device')
  const [targetId, setTargetId] = useState('')
  const sandbox = useStudioStore(s => s.sandbox)
  const sandboxCount = Object.keys(sandbox).length
  const sandboxNames = Object.values(sandbox).map(e => e.name).join(', ')
  const restoreSandbox = useStudioStore(s => s.restoreSandbox)
  const clearSandbox = useStudioStore(s => s.clearSandbox)

  const handleTargetKindChange = (kind) => {
    setTargetKind(kind)
    setTargetId('')
  }

  // Immediate apply: every effect, color, and parameter change pushes to
  // the selected target right away. Success is silent (the hardware is the
  // feedback); failures always toast so a dead target never looks live.
  const applyPreview = async (overrides = {}) => {
    const kind = overrides.kind ?? targetKind
    const id = overrides.id ?? targetId
    if (!id) return
    const payload = buildPreviewPayload({
      effectId: overrides.effectId ?? selectedEffectId,
      speed: overrides.speed ?? speed,
      intensity: overrides.intensity ?? intensity,
      paletteId: overrides.paletteId ?? selectedPaletteId,
      color: overrides.color ?? previewColor,
    })
    if (kind === 'group') {
      const grp = groups.find(g => g.id === id)
      if (!grp) return
      for (const memberId of grp.device_ids ?? []) {
        captureSandboxDevice(devices.find(d => d.id === memberId))
      }
      try {
        await sendGroupCommand(grp.id, payload)
      } catch {
        addToast({ message: `Group "${grp.name}" did not respond to the effect`, type: 'error' })
      }
      return
    }
    const dev = devices.find(d => d.id === id)
    if (!dev) return
    captureSandboxDevice(dev)
    const res = await sendCommand(dev, payload)
    if (res.stale) return
    if (!res.ok) {
      addToast({ message: `"${dev.name}" did not respond to the effect`, type: 'error' })
    }
  }

  // Color pickers fire continuously while dragging; trailing-edge debounce
  // keeps one preview per gesture instead of one per tick.
  const previewTimer = useRef(null)
  const queuePreview = (overrides = {}) => {
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => applyPreview(overrides), 250)
  }

  const handleSelectEffect = (id) => {
    setEffect(id)
    applyPreview({ effectId: id })
  }

  const handleTargetChange = (id) => {
    setTargetId(id)
    if (id) applyPreview({ kind: targetKind, id })
  }

  const handleResetPreview = async () => {
    setTargetId('')
    const solid = effects.find(e => e.id === 0) ?? effects.find(e => e.name?.toLowerCase() === 'solid')
    if (solid) setEffect(solid.id)
    const count = await restoreSandbox()
    addToast({
      message: count > 0
        ? `Preview reset${solid ? ' to Solid' : ''}. Devices restored.`
        : (solid ? 'Preview reset to Solid.' : 'Nothing to reset.'),
      type: 'info',
    })
  }

  const handleKeepSandbox = () => {
    clearSandbox()
    addToast({ message: 'Studio changes kept', type: 'success' })
  }

  const handleRestoreSandbox = async () => {
    await restoreSandbox()
    addToast({ message: 'Studio changes restored', type: 'info' })
  }

  const isCurrentSelectionVisible = filteredEffects.some(e => e.id === selectedEffectId)

  return (
    <div className={styles.container}>
      {/* Parameters Control Header */}
      <div className={styles.controlCard}>
        <h3 className={styles.cardTitle}>Effect Parameters & Color Tuning</h3>
        <div className={styles.controlGrid}>
          <div className={styles.sliderCol}>
            <Slider
              id="studio-speed"
              value={Math.round((speed / 255) * 100)}
              onCommit={pct => { const v = Math.round((pct / 100) * 255); setSpeed(v); applyPreview({ speed: v }) }}
              label={`Effect Speed (${speed})`}
            />
          </div>
          <div className={styles.sliderCol}>
            <Slider
              id="studio-intensity"
              value={Math.round((intensity / 255) * 100)}
              onCommit={pct => { const v = Math.round((pct / 100) * 255); setIntensity(v); applyPreview({ intensity: v }) }}
              label={`Effect Intensity (${intensity})`}
            />
          </div>

          {/* Palette Selector */}
          <div className={styles.selectCol}>
            <label className={styles.selectLabel}>WLED Palette</label>
            <select
              value={selectedPaletteId}
              onChange={e => { const id = Number(e.target.value); setPalette(id); applyPreview({ paletteId: id }) }}
              className={styles.paletteSelect}
            >
              {sortedByName(paletteCatalog).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Preview Color */}
          <div className={styles.colorCol}>
            <label className={styles.selectLabel}>Primary Color</label>
            <input
              type="color"
              value={previewColor}
              onChange={e => { setPreviewColor(e.target.value); queuePreview({ color: e.target.value }) }}
              className={styles.colorInput}
            />
          </div>
        </div>

        {/* Quick Apply Bar */}
        <div className={styles.applyBar}>
          <span className={styles.applyText}>Preview on:</span>
          {groups.length > 0 && (
            <div className={styles.targetToggle} role="tablist" aria-label="Preview target type">
              <button
                type="button"
                role="tab"
                aria-selected={targetKind === 'device'}
                className={[styles.pill, targetKind === 'device' && styles.pillActive].filter(Boolean).join(' ')}
                onClick={() => handleTargetKindChange('device')}
              >
                Device
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={targetKind === 'group'}
                className={[styles.pill, targetKind === 'group' && styles.pillActive].filter(Boolean).join(' ')}
                onClick={() => handleTargetKindChange('group')}
              >
                Group
              </button>
            </div>
          )}
          <select
            className={styles.applySelect}
            value={targetId}
            onChange={e => handleTargetChange(e.target.value)}
          >
            <option value="" disabled>{targetKind === 'group' ? 'Group...' : 'Device...'}</option>
            {sortedByName(targetKind === 'group' ? groups : devices).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleResetPreview}
            disabled={sandboxCount === 0 && !targetId}
            title="Select Solid, restore sandboxed devices, and clear the target"
          >
            Reset preview
          </button>
          <span className={styles.sandboxHint}>Pick a target, then click any effect to preview it live.</span>
        </div>

        {sandboxCount > 0 && (
          <div className={styles.sandboxRow}>
            <span className={styles.sandboxNames}>
              Sandbox: {sandboxNames}. Leaving Studio restores them.
            </span>
            <div className={styles.sandboxActions}>
              <button type="button" className={styles.keepBtn} onClick={handleKeepSandbox}>
                Keep changes
              </button>
              <button type="button" className={styles.resetBtn} onClick={handleRestoreSandbox}>
                Restore now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter, Search & View Toggle Bar */}
      <div className={styles.filterBar}>
        <div className={styles.categoryPills}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={[styles.pill, activeCategory === cat && styles.pillActive].filter(Boolean).join(' ')}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className={styles.filterControlsRight}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search WLED effects..."
            className={styles.searchInput}
          />
          <div className={styles.viewToggle} role="group" aria-label="Effect display view">
            <button
              type="button"
              className={[styles.toggleBtn, viewMode === 'cards' && styles.toggleBtnActive].filter(Boolean).join(' ')}
              onClick={() => handleViewModeChange('cards')}
              title="Card View"
              aria-pressed={viewMode === 'cards'}
            >
              <CardsIcon />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive].filter(Boolean).join(' ')}
              onClick={() => handleViewModeChange('list')}
              title="Dropdown / List View"
              aria-pressed={viewMode === 'list'}
            >
              <ListIcon />
              <span>Dropdown / List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Effects Display: Empty, Card Grid, or Dropdown/List View */}
      {filteredEffects.length === 0 ? (
        <div className={styles.emptyResults}>
          No effects found matching "{searchQuery}"
        </div>
      ) : viewMode === 'cards' ? (
        <div className={styles.effectGrid}>
          {filteredEffects.map(fx => {
            const isSelected = fx.id === selectedEffectId
            return (
              <div
                key={fx.id}
                className={[styles.effectCard, isSelected && styles.effectCardSelected].filter(Boolean).join(' ')}
                onClick={() => handleSelectEffect(fx.id)}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.fxName}>{fx.name}</span>
                  <span className={styles.fxCategory}>{fx.category}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.fxId}>ID #{fx.id}</span>
                  {isSelected && <span className={styles.activeTag}>Previewing</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.listViewContainer}>
          {/* Quick Select Dropdown */}
          <div className={styles.dropdownBar}>
            <label htmlFor="effect-dropdown-select" className={styles.dropdownLabel}>
              Quick Select Effect:
            </label>
            <select
              id="effect-dropdown-select"
              value={isCurrentSelectionVisible ? selectedEffectId : ''}
              onChange={e => {
                if (e.target.value !== '') {
                  handleSelectEffect(Number(e.target.value))
                }
              }}
              className={styles.effectDropdown}
            >
              {!isCurrentSelectionVisible && (
                <option value="" disabled>
                  Select an effect ({filteredEffects.length} available)...
                </option>
              )}
              {activeCategory === 'All' ? (
                CATEGORIES.filter(c => c !== 'All').map(cat => {
                  const catEffects = filteredEffects.filter(e => e.category === cat)
                  if (catEffects.length === 0) return null
                  return (
                    <optgroup key={cat} label={cat}>
                      {catEffects.map(fx => (
                        <option key={fx.id} value={fx.id}>
                          #{fx.id.toString().padStart(2, '0')} - {fx.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })
              ) : (
                filteredEffects.map(fx => (
                  <option key={fx.id} value={fx.id}>
                    #{fx.id.toString().padStart(2, '0')} - {fx.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Compact Rows List */}
          <div className={styles.effectList} role="listbox" aria-label="Effect list">
            {filteredEffects.map(fx => {
              const isSelected = fx.id === selectedEffectId
              return (
                <div
                  key={fx.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  className={[styles.effectRow, isSelected && styles.effectRowSelected].filter(Boolean).join(' ')}
                  onClick={() => handleSelectEffect(fx.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectEffect(fx.id)
                    }
                  }}
                >
                  <div className={styles.rowLeft}>
                    <span className={styles.rowId}>#{fx.id.toString().padStart(2, '0')}</span>
                    <span className={styles.rowName}>{fx.name}</span>
                  </div>
                  <div className={styles.rowRight}>
                    <span className={styles.rowCategory}>{fx.category}</span>
                    {isSelected && <span className={styles.activeTag}>Previewing</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
