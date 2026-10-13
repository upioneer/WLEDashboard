import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStudioStore } from '../../stores/studioStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { snapshotToCommand } from '../../lib/commands.js'
import { PixelStripCanvas } from '../../components/PixelStripCanvas/PixelStripCanvas.jsx'
import { PresetBrowser } from './PresetBrowser.jsx'
import { TimelineEditor } from './TimelineEditor.jsx'
import { PaletteDesigner } from './PaletteDesigner.jsx'
import { AudioVisualizer } from '../../components/AudioVisualizer/AudioVisualizer.jsx'
import { MatrixEditor } from './MatrixEditor.jsx'
import { ObjectDesigner } from './ObjectDesigner.jsx'
import styles from './StudioView.module.css'

export default function StudioView() {
  const activeTab        = useStudioStore(s => s.activeTab)
  const setActiveTab     = useStudioStore(s => s.setActiveTab)
  const fetchStudioData  = useStudioStore(s => s.fetchStudioData)
  const loading          = useStudioStore(s => s.loading)
  const error            = useStudioStore(s => s.error)
  const sandbox          = useStudioStore(s => s.sandbox)
  const clearSandbox     = useStudioStore(s => s.clearSandbox)
  const addToast         = useUIStore(s => s.addToast)

  useEffect(() => {
    fetchStudioData()
  }, [fetchStudioData])

  // Studio is non-destructive: leaving with unkept previews restores them
  useEffect(() => {
    return () => {
      const pending = useStudioStore.getState().sandbox
      const ids = Object.keys(pending)
      if (ids.length === 0) return
      const { sendCommand } = useDeviceStore.getState()
      Promise.allSettled(ids.map(id => {
        const cmd = snapshotToCommand(pending[id].snapshot)
        return cmd ? sendCommand(id, cmd) : Promise.resolve()
      }))
      useStudioStore.getState().clearSandbox()
    }
  }, [])

  const sandboxEntries = Object.entries(sandbox)

  const handleKeepSandbox = () => {
    clearSandbox()
    addToast({ message: 'Studio changes kept', type: 'success' })
  }

  const handleRestoreSandbox = () => {
    const { sendCommand } = useDeviceStore.getState()
    Promise.allSettled(sandboxEntries.map(([id, { snapshot }]) => {
      const cmd = snapshotToCommand(snapshot)
      return cmd ? sendCommand(id, cmd) : Promise.resolve()
    }))
    clearSandbox()
    addToast({ message: 'Studio changes restored', type: 'info' })
  }

  if (loading) return <StudioSkeleton />
  if (error) return <StudioError message={error} onRetry={fetchStudioData} />

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header Title */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Effect Studio</h1>
            <p className={styles.subtitle}>
              Browse WLED presets, build multi-track keyframe timelines, stream audio DDP visualizers, design 2D matrix artwork, and build 3D objects.
            </p>
          </div>
          <Link
            to="/guides?topic=studio-timelines-matrix"
            className={styles.guideLink}
            title="Read the Effect Studio, Matrix & 3D Objects Guide"
          >
            Studio Guide
          </Link>
        </header>

        {/* Live LED Strip Pixel Simulator - Pinned / Sticky when scrolling */}
        <div className={styles.stickySimulator}>
          <PixelStripCanvas />
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabBar}>
          <button
            className={[styles.tabBtn, activeTab === 'presets' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('presets')}
          >
            Preset Browser
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline Animator
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'palette' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('palette')}
          >
            Palette Creator
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'audio' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('audio')}
          >
            Audio Visualizer
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'matrix' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('matrix')}
          >
            2D Matrix Canvas
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'objects' && styles.tabBtnActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('objects')}
          >
            3D Objects
          </button>
        </div>

        {/* Sandbox banner: Studio previews restore on exit unless kept */}
        {sandboxEntries.length > 0 && (
          <div className={styles.sandboxBanner} role="status">
            <span className={styles.sandboxText}>
              <strong>Sandbox mode.</strong>
              {' '}Leaving Studio restores {sandboxEntries.map(([, e]) => e.name).join(', ')}.
            </span>
            <div className={styles.sandboxActions}>
              <button type="button" className={styles.sandboxKeepBtn} onClick={handleKeepSandbox}>
                Keep changes
              </button>
              <button type="button" className={styles.sandboxRestoreBtn} onClick={handleRestoreSandbox}>
                Restore now
              </button>
            </div>
          </div>
        )}

        {/* Active Tab Panel */}
        <div className={styles.tabContent}>
          {activeTab === 'presets' && <PresetBrowser />}
          {activeTab === 'timeline' && <TimelineEditor />}
          {activeTab === 'palette' && <PaletteDesigner />}
          {activeTab === 'audio' && <AudioVisualizer />}
          {activeTab === 'matrix' && <MatrixEditor />}
          {activeTab === 'objects' && <ObjectDesigner />}
        </div>
      </div>
    </main>
  )
}

function StudioSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.container}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonCanvas} />
      </div>
    </main>
  )
}

function StudioError({ message, onRetry }) {
  return (
    <main className={styles.page}>
      <div className={styles.errorBox}>
        <p>Error loading Studio: {message}</p>
        <button className={styles.tabBtnActive} onClick={onRetry}>Retry</button>
      </div>
    </main>
  )
}
