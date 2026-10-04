import { useState, useEffect, useRef, useCallback } from 'react'
import { matrixApi, devicesApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import {
  maxRowsForHeight,
  scrollStripLength,
  renderMarqueeFrame,
  applySerpentine,
  frameToRgbTriplets,
  buildMarqueeLoopState,
} from '../../lib/marquee.js'
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

  // Marquee maker state
  const [mode, setMode] = useState('draw')
  const [marqueeRows, setMarqueeRows] = useState([{ text: 'HELLO', color: '#ff0055' }])
  const [marqueeBg, setMarqueeBg] = useState('#000000')
  const [marqueeSpeed, setMarqueeSpeed] = useState(12)
  const [marqueeDirection, setMarqueeDirection] = useState('left')
  const [marqueeSerpentine, setMarqueeSerpentine] = useState(false)
  const [devices, setDevices] = useState([])
  const [pushDeviceId, setPushDeviceId] = useState('')
  const [pushing, setPushing] = useState(false)
  const [marqueeFrame, setMarqueeFrame] = useState([])
  const marqueeOffsetRef = useRef(0)
  const marqueeStateRef = useRef({})
  const devicesRef = useRef([])
  const pushFailedRef = useRef(false)

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

  const marqueeMaxRows = maxRowsForHeight(rows)

  // Clamp marquee row count to what the current height can fit
  useEffect(() => {
    setMarqueeRows(prev => {
      if (marqueeMaxRows <= 0) return prev.slice(0, 1)
      if (prev.length <= marqueeMaxRows) return prev
      return prev.slice(0, marqueeMaxRows)
    })
  }, [marqueeMaxRows])

  // Target devices for DDP push
  useEffect(() => {
    let active = true
    devicesApi.list()
      .then(list => {
        if (active && Array.isArray(list)) setDevices(list)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    devicesRef.current = devices
  }, [devices])

  marqueeStateRef.current = buildMarqueeLoopState({
    marqueeRows,
    bg: marqueeBg,
    speed: marqueeSpeed,
    direction: marqueeDirection,
    serpentine: marqueeSerpentine,
    pushing,
    deviceId: pushDeviceId,
    cols,
    rows,
  })

  // Restart the scroll whenever content, size, or direction changes
  useEffect(() => {
    if (mode !== 'marquee') return
    const total = Math.max(...marqueeRows.map(r => scrollStripLength(r.text, cols)), cols)
    const maxOffset = Math.max(0, total - cols)
    marqueeOffsetRef.current = marqueeDirection === 'left' ? 0 : maxOffset
  }, [mode, marqueeRows, cols, rows, marqueeDirection])

  // Marquee preview clock + DDP push loop (10 fps relay)
  useEffect(() => {
    if (mode !== 'marquee') return
    const timer = setInterval(() => {
      const s = marqueeStateRef.current
      const total = Math.max(...s.marqueeRows.map(r => scrollStripLength(r.text, s.cols)), s.cols)
      const maxOffset = Math.max(0, total - s.cols)
      let next = marqueeOffsetRef.current + (s.direction === 'left' ? 1 : -1) * (s.speed / 10)
      if (maxOffset === 0) {
        next = 0
      } else {
        if (next > maxOffset) next -= (maxOffset + 1)
        if (next < 0) next += (maxOffset + 1)
      }
      marqueeOffsetRef.current = next
      const frame = renderMarqueeFrame({
        width: s.cols,
        height: s.rows,
        rows: s.marqueeRows,
        bg: s.bg,
        offset: Math.floor(next),
      })
      setMarqueeFrame(frame)
      if (s.pushing && s.deviceId) {
        const device = devicesRef.current.find(d => d.id === s.deviceId)
        if (device?.ip_address) {
          const ordered = s.serpentine ? applySerpentine(frame, s.cols, s.rows) : frame
          matrixApi.streamDdp({ target_ip: device.ip_address, pixels: frameToRgbTriplets(ordered) })
            .catch(() => {
              if (!pushFailedRef.current) {
                pushFailedRef.current = true
                setPushing(false)
                addToast({ message: 'DDP push failed. Check the device is online and reachable.', type: 'error' })
              }
            })
        }
      }
    }, 100)
    return () => clearInterval(timer)
  }, [mode, addToast])

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

  const handleModeChange = (next) => {
    if (next === mode) return
    setPushing(false)
    pushFailedRef.current = false
    setMode(next)
  }

  const handlePushToggle = () => {
    if (pushing) {
      setPushing(false)
      return
    }
    const device = devices.find(d => d.id === pushDeviceId)
    if (!device?.ip_address) {
      addToast({ message: 'Select a target device before pushing', type: 'error' })
      return
    }
    pushFailedRef.current = false
    setPushing(true)
    addToast({ message: `Pushing marquee to ${device.name || device.ip_address}`, type: 'info' })
  }

  const handleAddMarqueeRow = () => {
    if (marqueeRows.length >= marqueeMaxRows || marqueeRows.length >= 10) return
    const fallback = PRESET_PALETTE[marqueeRows.length % PRESET_PALETTE.length]
    setMarqueeRows(prev => [...prev, { text: '', color: fallback }])
  }

  const handleRemoveMarqueeRow = (index) => {
    if (marqueeRows.length <= 1) return
    setMarqueeRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleMarqueeRowChange = (index, patch) => {
    setMarqueeRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleNewDrawing = () => {
    setEditingDrawingId(null)
    setDrawingName('')
    if (mode === 'marquee') {
      setMarqueeRows([{ text: '', color: '#ff0055' }])
      setMarqueeBg('#000000')
      marqueeOffsetRef.current = 0
      addToast({ message: 'Started new marquee', type: 'info' })
    } else {
      setPixels(Array(cols * rows).fill('#000000'))
      addToast({ message: 'Started new drawing', type: 'info' })
    }
  }

  const applyLoadedSize = (drawing) => {
    setCols(drawing.width)
    setRows(drawing.height)
    if (['8x8', '16x16', '32x8'].includes(`${drawing.width}x${drawing.height}`)) {
      setMatrixPreset(`${drawing.width}x${drawing.height}`)
    } else {
      setMatrixPreset('custom')
      setCustomCols(drawing.width)
      setCustomRows(drawing.height)
    }
  }

  const handleLoadDrawing = (drawing) => {
    setEditingDrawingId(drawing.id)
    setDrawingName(drawing.name)
    applyLoadedSize(drawing)
    setPushing(false)
    if (drawing.kind === 'marquee' && drawing.params) {
      const p = drawing.params
      const loadedRows = Array.isArray(p.rows) && p.rows.length > 0
        ? p.rows.slice(0, 10).map(r => ({ text: String(r.text ?? ''), color: r.color || '#ffffff' }))
        : [{ text: '', color: '#ffffff' }]
      setMarqueeRows(loadedRows)
      setMarqueeBg(p.bg || '#000000')
      setMarqueeSpeed(Number.isFinite(p.speed) ? p.speed : 12)
      setMarqueeDirection(p.direction === 'right' ? 'right' : 'left')
      setMarqueeSerpentine(!!p.serpentine)
      marqueeOffsetRef.current = 0
      setMode('marquee')
      addToast({ message: `Loaded marquee "${drawing.name}"`, type: 'info' })
      return
    }
    setMode('draw')
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
    const label = mode === 'marquee' ? 'marquee' : 'drawing'
    if (!trimmed) {
      addToast({ message: `${label[0].toUpperCase()}${label.slice(1)} name is required`, type: 'error' })
      return
    }

    const isDuplicate = savedDrawings.some(
      d => d.name.trim().toLowerCase() === trimmed.toLowerCase() && d.id !== editingDrawingId
    )
    if (isDuplicate) {
      addToast({ message: `A saved item named "${trimmed}" already exists`, type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = mode === 'marquee'
        ? {
            id: editingDrawingId || undefined,
            name: trimmed,
            width: cols,
            height: rows,
            pixels: marqueeFrame.length === cols * rows
              ? marqueeFrame
              : renderMarqueeFrame({
                  width: cols,
                  height: rows,
                  rows: marqueeRows,
                  bg: marqueeBg,
                  offset: Math.floor(marqueeOffsetRef.current),
                }),
            kind: 'marquee',
            params: {
              rows: marqueeRows,
              bg: marqueeBg,
              speed: marqueeSpeed,
              direction: marqueeDirection,
              serpentine: marqueeSerpentine,
            },
          }
        : {
            id: editingDrawingId || undefined,
            name: trimmed,
            width: cols,
            height: rows,
            pixels,
          }
      const saved = await matrixApi.saveDrawing(payload)
      if (editingDrawingId) {
        setSavedDrawings(prev => prev.map(d => (d.id === editingDrawingId ? saved : d)))
      } else {
        setSavedDrawings(prev => [saved, ...prev])
        setEditingDrawingId(saved.id)
      }
      addToast({
        message: editingDrawingId ? `Updated ${label} "${trimmed}"` : `Saved ${label} "${trimmed}"`,
        type: 'success',
      })
    } catch (err) {
      addToast({ message: err.message || `Failed to save matrix ${label}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const baseCellSize = getBaseCellSize(cols, rows)
  const cellSize = Math.max(MIN_CELL_SIZE, Math.round(baseCellSize * (zoom / 100)))

  const gridPixels = mode === 'marquee' ? marqueeFrame : pixels

  return (
    <div className={styles.container}>
      <div className={styles.editorCard}>
        <div className={styles.modeTabs} role="tablist" aria-label="Matrix editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'draw'}
            className={[styles.modeTab, mode === 'draw' && styles.modeTabActive].filter(Boolean).join(' ')}
            onClick={() => handleModeChange('draw')}
          >
            Draw
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'marquee'}
            className={[styles.modeTab, mode === 'marquee' && styles.modeTabActive].filter(Boolean).join(' ')}
            onClick={() => handleModeChange('marquee')}
          >
            Marquee
          </button>
        </div>

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
                {mode === 'marquee' ? 'New Marquee' : 'New Drawing'}
              </button>
            )}
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingDrawingId
                ? (mode === 'marquee' ? 'Update Marquee' : 'Update Drawing')
                : (mode === 'marquee' ? 'Save Marquee' : 'Save Drawing')}
            </button>
          </div>
        </div>

        {/* Tools & Palette Bar (Draw mode) or Marquee controls (Marquee mode) */}
        {mode === 'draw' ? (
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
        ) : (
        <div className={styles.marqueePanel}>
          {marqueeMaxRows === 0 ? (
            <div className={styles.marqueeWarn}>
              Text needs a matrix at least 7 pixels tall. Pick a taller size above.
            </div>
          ) : (
          <>
          <div className={styles.marqueeRows}>
            {marqueeRows.map((row, i) => (
              <div key={i} className={styles.marqueeTextRow}>
                <span className={styles.marqueeRowLabel}>Row {i + 1}</span>
                <input
                  type="text"
                  value={row.text}
                  onChange={e => handleMarqueeRowChange(i, { text: e.target.value })}
                  className={styles.marqueeTextInput}
                  placeholder="SCROLLING TEXT"
                  maxLength={120}
                />
                <input
                  type="color"
                  value={row.color}
                  onChange={e => handleMarqueeRowChange(i, { color: e.target.value })}
                  className={styles.colorPicker}
                  title={`Row ${i + 1} color`}
                />
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => handleRemoveMarqueeRow(i)}
                  disabled={marqueeRows.length <= 1}
                  title="Remove row"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.marqueeOptions}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleAddMarqueeRow}
              disabled={marqueeRows.length >= marqueeMaxRows || marqueeRows.length >= 10}
              title={`Up to ${marqueeMaxRows} rows fit this height`}
            >
              Add Row ({marqueeRows.length}/{marqueeMaxRows})
            </button>

            <label className={styles.marqueeOption}>
              <span className={styles.label}>Background</span>
              <input
                type="color"
                value={marqueeBg}
                onChange={e => setMarqueeBg(e.target.value)}
                className={styles.colorPicker}
              />
            </label>

            <label className={styles.marqueeOption}>
              <span className={styles.label}>Speed: {marqueeSpeed} px/s</span>
              <input
                type="range"
                min="1"
                max="60"
                value={marqueeSpeed}
                onChange={e => setMarqueeSpeed(Number(e.target.value))}
                className={styles.speedSlider}
              />
            </label>

            <label className={styles.marqueeOption}>
              <span className={styles.label}>Direction</span>
              <select
                value={marqueeDirection}
                onChange={e => setMarqueeDirection(e.target.value)}
                className={styles.sizeSelect}
              >
                <option value="left">Scroll left</option>
                <option value="right">Scroll right</option>
              </select>
            </label>

            <label className={styles.marqueeCheck}>
              <input
                type="checkbox"
                checked={marqueeSerpentine}
                onChange={e => setMarqueeSerpentine(e.target.checked)}
              />
              <span className={styles.label}>Serpentine wiring</span>
            </label>
          </div>

          <div className={styles.marqueePush}>
            <label className={styles.marqueeOption}>
              <span className={styles.label}>Target device</span>
              <select
                value={pushDeviceId}
                onChange={e => setPushDeviceId(e.target.value)}
                className={styles.sizeSelect}
              >
                <option value="">Select device...</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={[styles.pushBtn, pushing && styles.pushBtnActive].filter(Boolean).join(' ')}
              onClick={handlePushToggle}
            >
              {pushing ? 'Stop Push' : 'Push to Device'}
            </button>
            <span className={styles.dimBadge}>
              {cols} x {rows} ({cols * rows} LEDs)
            </span>
          </div>
          </>
          )}
        </div>
        )}

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
            {gridPixels.map((color, idx) => (
              <div
                key={idx}
                className={mode === 'marquee' ? styles.pixelCellStatic : styles.pixelCell}
                style={{
                  backgroundColor: color,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                }}
                onMouseDown={mode === 'marquee' ? undefined : (e) => handlePixelMouseDown(idx, e)}
                onMouseEnter={mode === 'marquee' ? undefined : () => handlePixelMouseEnter(idx)}
                onDragStart={e => e.preventDefault()}
                onContextMenu={e => e.preventDefault()}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Saved Designs Gallery */}
      <section className={styles.savedSection} aria-label="Saved designs">
        <div className={styles.savedSectionHeader}>
          <h3 className={styles.savedTitle}>Saved Designs ({savedDrawings.length})</h3>
        </div>

        {savedDrawings.length === 0 ? (
          <div className={styles.emptySaved}>
            No saved designs yet. Paint a drawing or build a marquee and save it above.
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
                    <span className={styles.savedCardName}>
                      {d.name}
                      {d.kind === 'marquee' && <span className={styles.kindBadge}>Marquee</span>}
                    </span>
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
