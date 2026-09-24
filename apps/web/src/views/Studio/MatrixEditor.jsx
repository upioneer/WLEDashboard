import { useState, useEffect, useRef, useCallback } from 'react'
import { matrixApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './MatrixEditor.module.css'

const PRESET_PALETTE = ['#ff0055', '#ffaa00', '#00ffcc', '#0099ff', '#7000ff', '#ffffff', '#000000']
const MIN_CELL_SIZE = 16

function resizeGrid(prevPixels, oldCols, oldRows, newCols, newRows) {
  const next = Array(newCols * newRows).fill('#000000')
  for (let r = 0; r < Math.min(oldRows, newRows); r++) {
    for (let c = 0; c < Math.min(oldCols, newCols); c++) {
      next[r * newCols + c] = prevPixels[r * oldCols + c] || '#000000'
    }
  }
  return next
}

function getBaseCellSize(cols, rows) {
  const maxDim = Math.max(cols, rows)
  if (maxDim <= 8) return 38
  if (maxDim <= 16) return 26
  if (maxDim <= 32) return 20
  return 18
}

export function MatrixEditor() {
  const [matrixPreset, setMatrixPreset] = useState('16x16')
  const [cols, setCols] = useState(16)
  const [rows, setRows] = useState(16)
  const [customCols, setCustomCols] = useState(24)
  const [customRows, setCustomRows] = useState(16)
  const [zoom, setZoom] = useState(100)
  const [activeColor, setActiveColor] = useState('#ff0055')
  const [drawingName, setDrawingName] = useState('')
  const [editingDrawingId, setEditingDrawingId] = useState(null)
  const [savedDrawings, setSavedDrawings] = useState([])
  const [isPainting, setIsPainting] = useState(false)
  const [saving, setSaving] = useState(false)
  const paintColorRef = useRef('#000000')
  const viewportRef = useRef(null)
  const addToast = useUIStore(s => s.addToast)

  const [pixels, setPixels] = useState(() => Array(16 * 16).fill('#000000'))

  useEffect(() => {
    let active = true
    matrixApi.listDrawings()
      .then(drawings => {
        if (active && Array.isArray(drawings)) {
          setSavedDrawings(drawings)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleMouseUp = () => setIsPainting(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault()
        setZoom(prev => {
          const delta = e.deltaY < 0 ? 25 : -25
          return Math.min(200, Math.max(50, prev + delta))
        })
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePixelMouseDown = (index, e) => {
    e?.preventDefault()
    if (e?.button === 2) {
      // Right click always erases to black
      paintColorRef.current = '#000000'
    } else {
      const current = pixels[index] || '#000000'
      const isCurrentBlack = current.toLowerCase() === '#000000' || current.toLowerCase() === '#000'
      const isCurrentActive = current.toLowerCase() === activeColor.toLowerCase()

      // Toggle: clicking an active color turns it black; otherwise applies activeColor
      if (isCurrentActive && !isCurrentBlack) {
        paintColorRef.current = '#000000'
      } else {
        paintColorRef.current = activeColor
      }
    }

    setIsPainting(true)
    const targetColor = paintColorRef.current
    setPixels(prev => {
      if (prev[index] === targetColor) return prev
      const updated = [...prev]
      updated[index] = targetColor
      return updated
    })
  }

  const handlePixelMouseEnter = (index) => {
    if (isPainting) {
      const targetColor = paintColorRef.current
      setPixels(prev => {
        if (prev[index] === targetColor) return prev
        const updated = [...prev]
        updated[index] = targetColor
        return updated
      })
    }
  }

  const handlePresetChange = (e) => {
    const val = e.target.value
    setMatrixPreset(val)
    if (val === 'custom') {
      const newCols = Math.max(1, Math.min(64, customCols))
      const newRows = Math.max(1, Math.min(64, customRows))
      setPixels(prev => resizeGrid(prev, cols, rows, newCols, newRows))
      setCols(newCols)
      setRows(newRows)
    } else {
      const [c, r] = val.split('x').map(Number)
      setPixels(prev => resizeGrid(prev, cols, rows, c, r))
      setCols(c)
      setRows(r)
    }
  }

  const handleCustomWidthChange = (val) => {
    const safeVal = Number.isFinite(val) ? val : 1
    const newCols = Math.max(1, Math.min(64, safeVal))
    setCustomCols(newCols)
    setPixels(prev => resizeGrid(prev, cols, rows, newCols, rows))
    setCols(newCols)
  }

  const handleCustomHeightChange = (val) => {
    const safeVal = Number.isFinite(val) ? val : 1
    const newRows = Math.max(1, Math.min(64, safeVal))
    setCustomRows(newRows)
    setPixels(prev => resizeGrid(prev, cols, rows, cols, newRows))
    setRows(newRows)
  }

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 25))
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 25))
  const handleZoomReset = () => setZoom(100)

  const handleClear = () => {
    setPixels(Array(cols * rows).fill('#000000'))
  }

  const handleFillAll = () => {
    setPixels(Array(cols * rows).fill(activeColor))
  }

  const handleNewDrawing = () => {
    setEditingDrawingId(null)
    setDrawingName('')
    setPixels(Array(cols * rows).fill('#000000'))
    addToast({ message: 'Started new drawing', type: 'info' })
  }

  const handleLoadDrawing = (drawing) => {
    setEditingDrawingId(drawing.id)
    setDrawingName(drawing.name)
    setCols(drawing.width)
    setRows(drawing.height)
    if (['8x8', '16x16', '32x8'].includes(`${drawing.width}x${drawing.height}`)) {
      setMatrixPreset(`${drawing.width}x${drawing.height}`)
    } else {
      setMatrixPreset('custom')
      setCustomCols(drawing.width)
      setCustomRows(drawing.height)
    }
    setPixels(drawing.pixels || Array(drawing.width * drawing.height).fill('#000000'))
    addToast({ message: `Loaded drawing "${drawing.name}"`, type: 'info' })
  }

  const handleDeleteDrawing = async (id, name) => {
    try {
      await matrixApi.deleteDrawing(id)
      setSavedDrawings(prev => prev.filter(d => d.id !== id))
      if (editingDrawingId === id) {
        setEditingDrawingId(null)
        setDrawingName('')
      }
      addToast({ message: `Deleted drawing "${name}"`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to delete drawing', type: 'error' })
    }
  }

  const handleSave = async () => {
    const trimmed = drawingName.trim()
    if (!trimmed) {
      addToast({ message: 'Drawing name is required', type: 'error' })
      return
    }

    const isDuplicate = savedDrawings.some(
      d => d.name.trim().toLowerCase() === trimmed.toLowerCase() && d.id !== editingDrawingId
    )
    if (isDuplicate) {
      addToast({ message: `A drawing named "${trimmed}" already exists`, type: 'error' })
      return
    }

    setSaving(true)
    try {
      const saved = await matrixApi.saveDrawing({
        id: editingDrawingId || undefined,
        name: trimmed,
        width: cols,
        height: rows,
        pixels,
      })
      if (editingDrawingId) {
        setSavedDrawings(prev => prev.map(d => (d.id === editingDrawingId ? saved : d)))
      } else {
        setSavedDrawings(prev => [saved, ...prev])
        setEditingDrawingId(saved.id)
      }
      addToast({
        message: editingDrawingId ? `Updated drawing "${trimmed}"` : `Saved drawing "${trimmed}"`,
        type: 'success',
      })
    } catch (err) {
      addToast({ message: err.message || 'Failed to save matrix drawing', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const baseCellSize = getBaseCellSize(cols, rows)
  const cellSize = Math.max(MIN_CELL_SIZE, Math.round(baseCellSize * (zoom / 100)))

  return (
    <div className={styles.container}>
      <div className={styles.editorCard}>
        <div className={styles.cardHeader}>
          <div className={styles.nameField}>
            <label className={styles.label}>Name *</label>
            <input
              type="text"
              value={drawingName}
              onChange={e => setDrawingName(e.target.value)}
              className={styles.nameInput}
              placeholder="e.g. Retro Space Invader"
              maxLength={64}
              required
            />
          </div>

          <div className={styles.sizeGroup}>
            <label className={styles.label}>Matrix Size:</label>
            <select
              value={matrixPreset}
              onChange={handlePresetChange}
              className={styles.sizeSelect}
            >
              <option value="8x8">8 x 8</option>
              <option value="16x16">16 x 16</option>
              <option value="32x8">32 x 8 Banner</option>
              <option value="custom">Custom</option>
            </select>

            {matrixPreset === 'custom' && (
              <div className={styles.customDimGroup}>
                <div className={styles.dimField}>
                  <span className={styles.dimLabel}>W</span>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={customCols}
                    onChange={e => handleCustomWidthChange(Number(e.target.value))}
                    className={styles.dimInput}
                    title="Width (Columns, 1-64)"
                  />
                </div>
                <span className={styles.dimTimes}>x</span>
                <div className={styles.dimField}>
                  <span className={styles.dimLabel}>H</span>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={customRows}
                    onChange={e => handleCustomHeightChange(Number(e.target.value))}
                    className={styles.dimInput}
                    title="Height (Rows, 1-64)"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.headerActions}>
            {editingDrawingId && (
              <button
                type="button"
                className={styles.newDrawingBtn}
                onClick={handleNewDrawing}
              >
                New Drawing
              </button>
            )}
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingDrawingId ? 'Update Drawing' : 'Save Drawing'}
            </button>
          </div>
        </div>

        {/* Tools & Palette Bar */}
        <div className={styles.toolsBar}>
          <div className={styles.paletteSwatches}>
            {PRESET_PALETTE.map(c => (
              <button
                key={c}
                type="button"
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
              title="Custom Color"
            />
          </div>

          <div className={styles.viewportControls}>
            <div className={styles.zoomControlGroup}>
              <span className={styles.zoomLabel}>Zoom:</span>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                className={styles.zoomBadge}
                onClick={handleZoomReset}
                title="Reset zoom to 100%"
              >
                {zoom}%
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                title="Zoom In"
              >
                +
              </button>
            </div>

            <div className={styles.dimBadge}>
              {cols} x {rows} ({cols * rows} LEDs)
            </div>

            <div className={styles.actionBtns}>
              <button type="button" className={styles.toolBtn} onClick={handleFillAll}>Fill All</button>
              <button type="button" className={styles.toolBtn} onClick={handleClear}>Clear</button>
            </div>
          </div>
        </div>

        {/* 2D Matrix Grid Canvas in Scrollable Viewport */}
        <div
          className={styles.canvasViewport}
          ref={viewportRef}
          onContextMenu={e => e.preventDefault()}
        >
          <div
            className={styles.matrixGrid}
            style={{
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            }}
          >
            {pixels.map((color, idx) => (
              <div
                key={idx}
                className={styles.pixelCell}
                style={{
                  backgroundColor: color,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                }}
                onMouseDown={(e) => handlePixelMouseDown(idx, e)}
                onMouseEnter={() => handlePixelMouseEnter(idx)}
                onDragStart={e => e.preventDefault()}
                onContextMenu={e => e.preventDefault()}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Saved Drawings Gallery */}
      <section className={styles.savedSection} aria-label="Saved drawings">
        <div className={styles.savedSectionHeader}>
          <h3 className={styles.savedTitle}>Saved Drawings ({savedDrawings.length})</h3>
        </div>

        {savedDrawings.length === 0 ? (
          <div className={styles.emptySaved}>
            No saved drawings yet. Paint a design and click Save Drawing above.
          </div>
        ) : (
          <div className={styles.savedGrid}>
            {savedDrawings.map(d => (
              <div
                key={d.id}
                className={[styles.savedCard, editingDrawingId === d.id && styles.savedCardActive].filter(Boolean).join(' ')}
                onClick={() => handleLoadDrawing(d)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') handleLoadDrawing(d) }}
              >
                <div className={styles.savedCardHeader}>
                  <div className={styles.savedCardTitleGroup}>
                    <span className={styles.savedCardName}>{d.name}</span>
                    <span className={styles.savedCardMeta}>
                      {d.width} x {d.height} ({d.width * d.height} LEDs)
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteDrawingBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDrawing(d.id, d.name)
                    }}
                    title={`Delete "${d.name}"`}
                  >
                    Delete
                  </button>
                </div>

                <div
                  className={styles.miniThumbnail}
                  style={{
                    gridTemplateColumns: `repeat(${d.width}, 1fr)`,
                    aspectRatio: `${d.width} / ${d.height}`,
                  }}
                >
                  {(d.pixels || []).map((c, i) => (
                    <div
                      key={i}
                      className={styles.miniCell}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
