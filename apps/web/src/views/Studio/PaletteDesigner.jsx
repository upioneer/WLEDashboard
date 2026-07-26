import { useState } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './PaletteDesigner.module.css'

export function PaletteDesigner() {
  const customPalettes  = useStudioStore(s => s.customPalettes)
  const savePalette     = useStudioStore(s => s.savePalette)
  const deletePalette   = useStudioStore(s => s.deletePalette)
  const setPreviewColor = useStudioStore(s => s.setPreviewColor)
  const addToast        = useUIStore(s => s.addToast)

  const [paletteName, setPaletteName] = useState('Cyber Neon Gradient')
  const [stops, setStops]             = useState(['#ff0055', '#7000ff', '#00e5ff', '#ffea00'])

  const gradientCss = `linear-gradient(90deg, ${stops.join(', ')})`

  const handleAddStop = () => {
    if (stops.length >= 8) return
    setStops([...stops, '#ffffff'])
  }

  const handleRemoveStop = (index) => {
    if (stops.length <= 2) return
    setStops(stops.filter((_, i) => i !== index))
  }

  const handleUpdateStop = (index, color) => {
    const updated = [...stops]
    updated[index] = color
    setStops(updated)
    setPreviewColor(color)
  }

  const handleSavePalette = async () => {
    if (!paletteName.trim()) return
    try {
      await savePalette({
        name: paletteName.trim(),
        colors: stops,
      })
      addToast({ message: `Saved custom palette "${paletteName}"`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to save custom palette', type: 'error' })
    }
  }

  return (
    <div className={styles.container}>
      {/* Palette Builder Card */}
      <div className={styles.designerCard}>
        <div className={styles.cardHeader}>
          <input
            type="text"
            value={paletteName}
            onChange={e => setPaletteName(e.target.value)}
            className={styles.nameInput}
            placeholder="Palette Name..."
          />
          <button className={styles.saveBtn} onClick={handleSavePalette}>
            Save Custom Palette
          </button>
        </div>

        {/* Live Gradient Preview Bar */}
        <div className={styles.gradientPreviewWrapper}>
          <div className={styles.gradientBar} style={{ background: gradientCss }} />
        </div>

        {/* Color Stops Controls */}
        <div className={styles.stopsHeader}>
          <span>Color Stops ({stops.length}/8)</span>
          {stops.length < 8 && (
            <button className={styles.addStopBtn} onClick={handleAddStop}>+ Add Color Stop</button>
          )}
        </div>

        <div className={styles.stopsGrid}>
          {stops.map((color, i) => (
            <div key={i} className={styles.stopCard}>
              <span className={styles.stopNum}>Stop #{i + 1}</span>
              <input
                type="color"
                value={color}
                onChange={e => handleUpdateStop(i, e.target.value)}
                className={styles.colorPicker}
              />
              <span className={styles.hexCode}>{color}</span>
              {stops.length > 2 && (
                <button className={styles.removeStopBtn} onClick={() => handleRemoveStop(i)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Palette Library */}
      {customPalettes.length > 0 && (
        <div className={styles.libraryCard}>
          <h3 className={styles.cardTitle}>Custom Palette Library</h3>
          <div className={styles.paletteGrid}>
            {customPalettes.map(p => {
              const bg = `linear-gradient(90deg, ${(p.colors || []).join(', ')})`
              return (
                <div key={p.id} className={styles.paletteItemCard}>
                  <div className={styles.paletteMeta}>
                    <span className={styles.paletteItemName}>{p.name}</span>
                    <button className={styles.deleteBtn} onClick={() => deletePalette(p.id)}>Delete</button>
                  </div>
                  <div
                    className={styles.miniGradientBar}
                    style={{ background: bg }}
                    onClick={() => {
                      setPaletteName(p.name)
                      setStops(p.colors || [])
                    }}
                    title="Click to load into editor"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
