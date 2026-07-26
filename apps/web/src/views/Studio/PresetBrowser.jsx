import { useState, useMemo } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { Slider } from '../../components/Slider/Slider.jsx'
import styles from './PresetBrowser.module.css'

const CATEGORIES = ['All', 'Basic', 'Dynamic', 'Fire', 'Festive', 'Nature']

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
  const addToast      = useUIStore(s => s.addToast)

  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery]       = useState('')

  const filteredEffects = useMemo(() => {
    return effects.filter(e => {
      const matchesCat = activeCategory === 'All' || e.category === activeCategory
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [effects, activeCategory, searchQuery])

  const handleApplyToDevice = (devId) => {
    const dev = devices.find(d => d.id === devId)
    if (!dev) return
    sendCommand(dev, {
      on: true,
      seg: [{ fx: selectedEffectId, sx: speed, ix: intensity, pal: selectedPaletteId }],
    })
    addToast({ message: `Applied effect "${effects.find(e => e.id === selectedEffectId)?.name}" to ${dev.name}`, type: 'success' })
  }

  const handleApplyToGroup = (grpId) => {
    const grp = groups.find(g => g.id === grpId)
    if (!grp) return
    sendGroupCommand(grp.id, {
      on: true,
      seg: [{ fx: selectedEffectId, sx: speed, ix: intensity, pal: selectedPaletteId }],
    })
    addToast({ message: `Applied effect to group "${grp.name}"`, type: 'success' })
  }

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
              onCommit={pct => setSpeed(Math.round((pct / 100) * 255))}
              label={`Effect Speed (${speed})`}
            />
          </div>
          <div className={styles.sliderCol}>
            <Slider
              id="studio-intensity"
              value={Math.round((intensity / 255) * 100)}
              onCommit={pct => setIntensity(Math.round((pct / 100) * 255))}
              label={`Effect Intensity (${intensity})`}
            />
          </div>

          {/* Palette Selector */}
          <div className={styles.selectCol}>
            <label className={styles.selectLabel}>WLED Palette</label>
            <select
              value={selectedPaletteId}
              onChange={e => setPalette(Number(e.target.value))}
              className={styles.paletteSelect}
            >
              {paletteCatalog.map(p => (
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
              onChange={e => setPreviewColor(e.target.value)}
              className={styles.colorInput}
            />
          </div>
        </div>

        {/* Quick Apply Bar */}
        <div className={styles.applyBar}>
          <span className={styles.applyText}>Apply Live Config to Target:</span>
          <select className={styles.applySelect} onChange={e => e.target.value && handleApplyToDevice(e.target.value)} defaultValue="">
            <option value="" disabled>Device...</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {groups.length > 0 && (
            <select className={styles.applySelect} onChange={e => e.target.value && handleApplyToGroup(e.target.value)} defaultValue="">
              <option value="" disabled>Group...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
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
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search WLED effects..."
          className={styles.searchInput}
        />
      </div>

      {/* Effects Catalog Grid */}
      <div className={styles.effectGrid}>
        {filteredEffects.map(fx => {
          const isSelected = fx.id === selectedEffectId
          return (
            <div
              key={fx.id}
              className={[styles.effectCard, isSelected && styles.effectCardSelected].filter(Boolean).join(' ')}
              onClick={() => setEffect(fx.id)}
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
    </div>
  )
}
