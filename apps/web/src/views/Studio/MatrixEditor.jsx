import { useState } from 'react'
import { matrixApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './MatrixEditor.module.css'

const PRESET_PALETTE = ['#ff0055', '#ffaa00', '#00ffcc', '#0099ff', '#7000ff', '#ffffff', '#000000']

export function MatrixEditor() {
  const [matrixSize, setMatrixSize] = useState('16x16') // '8x8' | '16x16' | '32x8'
  const [activeColor, setActiveColor] = useState('#ff0055')
  const [drawingName, setDrawingName] = useState('My Pixel Artwork')
  const [savedDrawings, setSavedDrawings] = useState([])
  const addToast = useUIStore(s => s.addToast)

  const [cols, rows] = matrixSize.split('x').map(Number)
  const [pixels, setPixels] = useState(() => Array(cols * rows).fill('#000000'))

  const handlePixelClick = (index) => {
    const updated = [...pixels]
    updated[index] = activeColor
    setPixels(updated)
  }

  const handleClear = () => {
    setPixels(Array(cols * rows).fill('#000000'))
  }

  const handleFillAll = () => {
    setPixels(Array(cols * rows).fill(activeColor))
  }

  const handleSave = async () => {
    if (!drawingName.trim()) return
    try {
      const saved = await matrixApi.saveDrawing({
        name: drawingName.trim(),
        width: cols,
        height: rows,
        pixels,
      })
      setSavedDrawings([saved, ...savedDrawings])
      addToast({ message: `Saved pixel drawing "${drawingName}"`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to save matrix drawing', type: 'error' })
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.editorCard}>
        <div className={styles.cardHeader}>
          <input
            type="text"
            value={drawingName}
            onChange={e => setDrawingName(e.target.value)}
            className={styles.nameInput}
            placeholder="Drawing Title..."
          />
          <div className={styles.sizeGroup}>
            <label className={styles.label}>Matrix Size:</label>
            <select
              value={matrixSize}
              onChange={e => {
                setMatrixSize(e.target.value)
                const [c, r] = e.target.value.split('x').map(Number)
                setPixels(Array(c * r).fill('#000000'))
              }}
              className={styles.sizeSelect}
            >
              <option value="8x8">8 x 8</option>
              <option value="16x16">16 x 16</option>
              <option value="32x8">32 x 8 Banner</option>
            </select>
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>Save Drawing</button>
        </div>

        {/* Tools & Palette Bar */}
        <div className={styles.toolsBar}>
          <div className={styles.paletteSwatches}>
            {PRESET_PALETTE.map(c => (
              <button
                key={c}
                className={[styles.swatch, activeColor === c && styles.swatchActive].filter(Boolean).join(' ')}
                style={{ backgroundColor: c }}
                onClick={() => setActiveColor(c)}
              />
            ))}
            <input
              type="color"
              value={activeColor}
              onChange={e => setActiveColor(e.target.value)}
              className={styles.colorPicker}
            />
          </div>

          <div className={styles.actionBtns}>
            <button className={styles.toolBtn} onClick={handleFillAll}>Fill All</button>
            <button className={styles.toolBtn} onClick={handleClear}>Clear</button>
          </div>
        </div>

        {/* 2D Matrix Grid Canvas */}
        <div
          className={styles.matrixGrid}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {pixels.map((color, idx) => (
            <div
              key={idx}
              className={styles.pixelCell}
              style={{ backgroundColor: color }}
              onClick={() => handlePixelClick(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
