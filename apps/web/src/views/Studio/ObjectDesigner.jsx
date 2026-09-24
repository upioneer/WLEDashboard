import { useMemo, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStudioStore } from '../../stores/studioStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { studioApi } from '../../lib/api.js'
import { Slider } from '../../components/Slider/Slider.jsx'
import styles from './ObjectDesigner.module.css'

const SHAPE_LABELS = {
  cone: 'Cone (trees)',
  cylinder: 'Cylinder (columns)',
  sphere: 'Sphere (globes)',
  box: 'Box (frames)',
  plane: 'Plane (panels)',
}

const DEFAULT_DIMS = {
  cone: { height: 2, radius: 0.5 },
  cylinder: { height: 2, radius: 0.3 },
  sphere: { radius: 0.4 },
  box: { width: 1, height: 1, depth: 1 },
  plane: { width: 1, height: 0.6 },
}

const DIM_FIELDS = {
  cone: [['height', 'Height (m)'], ['radius', 'Base radius (m)']],
  cylinder: [['height', 'Height (m)'], ['radius', 'Radius (m)']],
  sphere: [['radius', 'Radius (m)']],
  box: [['width', 'Width (m)'], ['height', 'Height (m)'], ['depth', 'Depth (m)']],
  plane: [['width', 'Width (m)'], ['height', 'Height (m)']],
}

const STRATEGY_HINTS = {
  spiral: 'Continuous wrap from top to bottom. Best all rounder for trees and columns.',
  vertical_runs: 'Straight drops from top to bottom. Classic tree light strings.',
  rings: 'Horizontal hoops stacked along the height.',
  latitude_rings: 'Horizontal hoops from pole to pole.',
  longitude_runs: 'Over the top runs, like globe meridians.',
  edge_frame: 'One continuous run along all 12 edges.',
  face_columns: 'Vertical columns across the front and back faces.',
  serpentine_rows: 'Back and forth rows. Classic matrix panel wiring.',
  columns: 'Top to bottom columns across the panel.',
}

export function ObjectDesigner() {
  const objectShapes       = useStudioStore(s => s.objectShapes)
  const objectStrategies   = useStudioStore(s => s.objectStrategies)
  const objectChips        = useStudioStore(s => s.objectChips)
  const powerDisclaimer    = useStudioStore(s => s.powerDisclaimer)
  const studioObjects      = useStudioStore(s => s.studioObjects)
  const saveStudioObject   = useStudioStore(s => s.saveStudioObject)
  const deleteStudioObject = useStudioStore(s => s.deleteStudioObject)
  const effects            = useStudioStore(s => s.effects)
  const selectedEffectId   = useStudioStore(s => s.selectedEffectId)
  const speed              = useStudioStore(s => s.speed)
  const intensity          = useStudioStore(s => s.intensity)
  const selectedPaletteId  = useStudioStore(s => s.selectedPaletteId)
  const previewColor       = useStudioStore(s => s.previewColor)

  const devices     = useDeviceStore(s => s.devices)
  const sendCommand = useDeviceStore(s => s.sendCommand)
  const addToast    = useUIStore(s => s.addToast)

  const [editingId, setEditingId]         = useState(null)
  const [name, setName]                   = useState('')
  const [shape, setShape]                 = useState('cone')
  const [dims, setDims]                   = useState(DEFAULT_DIMS.cone)
  const [strategy, setStrategy]           = useState('spiral')
  const [density, setDensity]             = useState(60)
  const [direction, setDirection]         = useState('top_down')
  const [startOffset, setStartOffset]     = useState(0)
  const [turns, setTurns]                 = useState(10)
  const [runs, setRuns]                   = useState(8)
  const [ringSpacing, setRingSpacing]     = useState(0.1)
  const [rowSpacing, setRowSpacing]       = useState(0.05)
  const [columns, setColumns]             = useState(8)
  const [chip, setChip]                   = useState('ws2812b')
  const [deviceId, setDeviceId]           = useState('')
  const [preview, setPreview]             = useState(null)
  const [previewError, setPreviewError]   = useState(null)
  const [previewing, setPreviewing]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [showWireframe, setShowWireframe] = useState(true)

  const strategies = objectStrategies[shape] ?? []

  // Auto-update preview on the fly whenever dimensions, layout, or chip change
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      try {
        setPreviewing(true)
        const payload = {
          shape,
          dims,
          strategy,
          options: { density, direction, startOffset, turns, runs, ringSpacing, rowSpacing, columns },
          chip,
        }
        const result = await studioApi.previewObject(payload)
        if (active) {
          setPreview(result)
          setPreviewError(null)
        }
      } catch (err) {
        if (active) {
          setPreviewError(err.message)
        }
      } finally {
        if (active) {
          setPreviewing(false)
        }
      }
    }, 150)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [shape, dims, strategy, density, direction, startOffset, turns, runs, ringSpacing, rowSpacing, columns, chip])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setShape('cone')
    setDims(DEFAULT_DIMS.cone)
    setStrategy((objectStrategies.cone ?? [])[0] ?? 'spiral')
    setDensity(60)
    setDirection('top_down')
    setStartOffset(0)
    setTurns(10)
    setRuns(8)
    setRingSpacing(0.1)
    setRowSpacing(0.05)
    setColumns(8)
    setChip('ws2812b')
    setDeviceId('')
    setPreviewError(null)
  }

  const changeShape = (next) => {
    setShape(next)
    setDims(DEFAULT_DIMS[next])
    setStrategy((objectStrategies[next] ?? [])[0] ?? 'spiral')
  }

  const buildPayload = () => ({
    shape,
    dims,
    strategy,
    options: { density, direction, startOffset, turns, runs, ringSpacing, rowSpacing, columns },
    chip,
  })

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      addToast({ message: 'Object name is required', type: 'error' })
      return
    }

    const isDuplicate = studioObjects.some(
      o => o.name.trim().toLowerCase() === trimmed.toLowerCase() && o.id !== editingId
    )
    if (isDuplicate) {
      addToast({ message: `An object named "${trimmed}" already exists`, type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: trimmed,
        ...buildPayload(),
        device_id: deviceId || null,
      }
      if (editingId) {
        payload.id = editingId
      }
      const saved = await saveStudioObject(payload)
      if (saved?.id) setEditingId(saved.id)
      addToast({ message: editingId ? `Updated "${trimmed}"` : `Saved "${trimmed}"`, type: 'success' })
    } catch (err) {
      addToast({ message: `Save failed: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePushToDevice = () => {
    const dev = devices.find(d => d.id === deviceId)
    if (!dev) {
      addToast({ message: 'Select a target device first', type: 'error' })
      return
    }
    if (preview && dev.led_count && preview.count > dev.led_count) {
      addToast({ message: `${dev.name} reports ${dev.led_count} LEDs but the layout needs ${preview.count}`, type: 'error' })
      return
    }
    sendCommand(dev, {
      on: true,
      seg: [{ fx: selectedEffectId, sx: speed, ix: intensity, pal: selectedPaletteId }],
    })
    addToast({ message: `Applied effect to ${dev.name}`, type: 'success' })
  }

  const handleLoad = (obj) => {
    setEditingId(obj.id)
    setName(obj.name)
    setShape(obj.shape)
    setDims(obj.dims)
    setStrategy(obj.strategy)
    setDensity(obj.options?.density ?? 60)
    setDirection(obj.options?.direction ?? 'top_down')
    setStartOffset(obj.options?.startOffset ?? 0)
    setTurns(obj.options?.turns ?? 10)
    setRuns(obj.options?.runs ?? 8)
    setRingSpacing(obj.options?.ringSpacing ?? 0.1)
    setRowSpacing(obj.options?.rowSpacing ?? 0.05)
    setColumns(obj.options?.columns ?? 8)
    setChip(obj.chip ?? 'ws2812b')
    setDeviceId(obj.device_id ?? '')
    setPreviewError(null)
  }

  const handleDelete = async (id) => {
    try {
      await deleteStudioObject(id)
      if (editingId === id) {
        resetForm()
      }
      addToast({ message: 'Object deleted', type: 'success' })
    } catch (err) {
      addToast({ message: `Delete failed: ${err.message}`, type: 'error' })
    }
  }

  const needsSpiralTurns = strategy === 'spiral' && (shape === 'cone' || shape === 'cylinder')
  const needsRuns = strategy === 'vertical_runs' || strategy === 'longitude_runs'
  const needsRings = strategy === 'rings' || strategy === 'latitude_rings'
  const needsRows = strategy === 'serpentine_rows'
  const needsColumns = strategy === 'face_columns' || strategy === 'columns'

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* ── Design Form ── */}
        <section className={styles.card} aria-label="Object design">
          <h3 className={styles.cardTitle}>{editingId ? 'Edit Object' : 'Design Object'}</h3>

          <label className={styles.field}>
            <span>Name *</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
              placeholder="e.g. Front Porch Tree"
              required
            />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span>Shape</span>
              <select value={shape} onChange={e => changeShape(e.target.value)}>
                {(objectShapes.length ? objectShapes : Object.keys(SHAPE_LABELS)).map(s => (
                  <option key={s} value={s}>{SHAPE_LABELS[s] ?? s}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Layout strategy</span>
              <select value={strategy} onChange={e => setStrategy(e.target.value)}>
                {strategies.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
          </div>
          {STRATEGY_HINTS[strategy] && <p className={styles.hint}>{STRATEGY_HINTS[strategy]}</p>}

          <div className={styles.row}>
            {(DIM_FIELDS[shape] ?? []).map(([key, label]) => (
              <label key={key} className={styles.field}>
                <span>{label}</span>
                <input
                  type="number" min="0.01" step="0.05" value={dims[key] ?? ''}
                  onChange={e => setDims({ ...dims, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>

          <Slider
            id="object-density"
            value={Math.min(100, Math.round((density / 150) * 100))}
            onCommit={pct => setDensity(Math.max(1, Math.round((pct / 100) * 150)))}
            label={`LED density (${density}/m)`}
          />

          <div className={styles.row}>
            <label className={styles.field}>
              <span>Direction</span>
              <select value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="top_down">Top down</option>
                <option value="bottom_up">Bottom up</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Start offset (LEDs)</span>
              <input
                type="number" min="0" step="1" value={startOffset}
                onChange={e => setStartOffset(Number(e.target.value))}
              />
            </label>
          </div>

          {needsSpiralTurns && (
            <label className={styles.field}>
              <span>Spiral turns</span>
              <input
                type="number"
                min="1"
                max="100"
                value={turns}
                onChange={e => setTurns(Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
          {needsRuns && (
            <label className={styles.field}>
              <span>Runs</span>
              <input type="number" min="1" max="64" value={runs} onChange={e => setRuns(Number(e.target.value))} />
            </label>
          )}
          {needsRings && (
            <label className={styles.field}>
              <span>Ring spacing (m)</span>
              <input type="number" min="0.02" step="0.01" value={ringSpacing} onChange={e => setRingSpacing(Number(e.target.value))} />
            </label>
          )}
          {needsRows && (
            <label className={styles.field}>
              <span>Row spacing (m)</span>
              <input type="number" min="0.02" step="0.01" value={rowSpacing} onChange={e => setRowSpacing(Number(e.target.value))} />
            </label>
          )}
          {needsColumns && (
            <label className={styles.field}>
              <span>Columns</span>
              <input type="number" min="1" max="64" value={columns} onChange={e => setColumns(Number(e.target.value))} />
            </label>
          )}

          <label className={styles.field}>
            <span>LED chip (sets power math)</span>
            <select value={chip} onChange={e => setChip(e.target.value)}>
              {Object.entries(objectChips).map(([key, ref]) => (
                <option key={key} value={key}>{ref.label} ({ref.voltage}V)</option>
              ))}
            </select>
          </label>
          <p className={styles.hint}>Chip and voltage are always entered by hand. WLED firmware cannot report what is wired to it.</p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving...' : editingId ? 'Update Object' : 'Save Object'}
            </button>
            {editingId && (
              <button type="button" className={styles.secondaryBtn} onClick={resetForm}>
                New Object
              </button>
            )}
          </div>
          {previewError && <p className={styles.error}>{previewError}</p>}
        </section>

        {/* ── 3D Preview + Blueprint ── */}
        <section className={styles.card} aria-label="Preview and blueprint">
          <div className={styles.cardHeaderRow}>
            <h3 className={styles.cardTitle}>Live Preview & Blueprint</h3>
            <label className={styles.guideToggle}>
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={e => setShowWireframe(e.target.checked)}
              />
              <span>Structure guide</span>
            </label>
          </div>

          {!preview && previewing && <p className={styles.hint}>Computing layout preview...</p>}
          {preview && (
            <>
              <div className={styles.viewport}>
                <ObjectViewport
                  points={preview.points}
                  dims={dims}
                  shape={shape}
                  color={previewColor}
                  showWireframe={showWireframe}
                />
              </div>
              <dl className={styles.blueprint}>
                <div><dt>LEDs</dt><dd>{preview.count}</dd></div>
                <div><dt>Wire path</dt><dd>{preview.pathLengthM.toFixed(2)} m</dd></div>
                <div><dt>Strip to buy</dt><dd>{preview.stripLengthM.toFixed(2)} m (incl. 5% slack)</dd></div>
                <div><dt>Runs</dt><dd>{preview.runs.length}</dd></div>
                <div><dt>Supply</dt><dd>{preview.power.psuWatts}W {preview.power.voltage}V ({preview.power.psuAmps}A with headroom)</dd></div>
                <div><dt>Power injection</dt><dd>{preview.power.injectionPoints} extra feed{preview.power.injectionPoints === 1 ? '' : 's'} (every {preview.power.injectionEveryN} LEDs)</dd></div>
              </dl>
              <p className={styles.hint}>{preview.power.disclaimer || powerDisclaimer}</p>

              <h4 className={styles.subTitle}>Cut list (per run)</h4>
              <table className={styles.cutTable}>
                <thead><tr><th>Run</th><th>LEDs</th><th>Length</th></tr></thead>
                <tbody>
                  {preview.runs.map((r, i) => (
                    <tr key={i}><td>{i + 1}</td><td>{r.count}</td><td>{(r.lengthM || (preview.pathLengthM / preview.runs.length)).toFixed(2)} m</td></tr>
                  ))}
                </tbody>
              </table>

              <h4 className={styles.subTitle}>Power & wiring safety</h4>
              <ul className={styles.safety}>
                <li>Inject {preview.power.voltage}V power every {preview.power.injectionEveryN} LEDs. Long runs brown out at the far end without it.</li>
                <li>Common ground is mandatory: PSU ground, ESP ground, and strip ground must all be tied together or the data signal has no reference.</li>
                <li>Never power a long strip through the ESP board. Feed the strip directly and fuse the positive lead near the supply.</li>
                <li>Disconnect power before wiring. Verify polarity before first power on.</li>
              </ul>

              <h4 className={styles.subTitle}>Push to device</h4>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Target device</span>
                  <select value={deviceId} onChange={e => setDeviceId(e.target.value)}>
                    <option value="">Select...</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.name}{d.led_count ? ` (${d.led_count})` : ''}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className={styles.secondaryBtn} onClick={handlePushToDevice}>
                  Apply {effects.find(e => e.id === selectedEffectId)?.name ?? 'effect'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Saved Objects ── */}
      {studioObjects.length > 0 && (
        <section className={styles.card} aria-label="Saved objects">
          <h3 className={styles.cardTitle}>Saved Objects</h3>
          <ul className={styles.savedList}>
            {studioObjects.map(o => (
              <li key={o.id}>
                <button type="button" className={styles.savedName} onClick={() => handleLoad(o)}>{o.name}</button>
                <span className={styles.savedMeta}>{o.shape} / {o.strategy.replace(/_/g, ' ')}</span>
                <button type="button" className={styles.dangerLink} onClick={() => handleDelete(o.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ObjectViewport({ points, dims, shape, color, showWireframe = true }) {
  const positions = useMemo(() => new Float32Array(points.flat()), [points])
  const size = Math.max(dims.height ?? dims.radius ?? 1, dims.width ?? 0, dims.radius ?? 0, 0.5)
  const dist = size * 2.2
  const yCenter = shape === 'cone' || shape === 'cylinder' ? (dims.height ?? 1) / 2 : 0
  return (
    <Canvas camera={{ position: [dist, dist * 0.7, dist], fov: 45 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={0.9} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.032} color={color || '#38bdf8'} sizeAttenuation />
      </points>
      {showWireframe && (
        <mesh position={[0, yCenter, 0]}>
          <ShapeGeometry shape={shape} dims={dims} />
          <meshBasicMaterial color="#334155" wireframe transparent opacity={0.14} />
        </mesh>
      )}
      <OrbitControls makeDefault />
    </Canvas>
  )
}

function ShapeGeometry({ shape, dims }) {
  if (shape === 'cone') return <coneGeometry args={[dims.radius ?? 0.5, dims.height ?? 2, 48, 1, true]} />
  if (shape === 'cylinder') return <cylinderGeometry args={[dims.radius ?? 0.3, dims.radius ?? 0.3, dims.height ?? 2, 48, 1, true]} />
  if (shape === 'sphere') return <sphereGeometry args={[dims.radius ?? 0.4, 48, 32]} />
  if (shape === 'box') return <boxGeometry args={[dims.width ?? 1, dims.height ?? 1, dims.depth ?? 1]} />
  return <planeGeometry args={[dims.width ?? 1, dims.height ?? 0.6]} />
}
