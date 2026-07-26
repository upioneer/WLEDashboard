import { useEffect } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import { PixelStripCanvas } from '../../components/PixelStripCanvas/PixelStripCanvas.jsx'
import { PresetBrowser } from './PresetBrowser.jsx'
import { TimelineEditor } from './TimelineEditor.jsx'
import { PaletteDesigner } from './PaletteDesigner.jsx'
import styles from './StudioView.module.css'

export default function StudioView() {
  const activeTab        = useStudioStore(s => s.activeTab)
  const setActiveTab     = useStudioStore(s => s.setActiveTab)
  const fetchStudioData  = useStudioStore(s => s.fetchStudioData)
  const loading          = useStudioStore(s => s.loading)
  const error            = useStudioStore(s => s.error)

  useEffect(() => {
    fetchStudioData()
  }, [fetchStudioData])

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
              Browse WLED presets, build multi-track keyframe timelines, and design custom color palettes.
            </p>
          </div>
        </header>

        {/* Live LED Strip Pixel Simulator */}
        <PixelStripCanvas />

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
        </div>

        {/* Active Tab Panel */}
        <div className={styles.tabContent}>
          {activeTab === 'presets' && <PresetBrowser />}
          {activeTab === 'timeline' && <TimelineEditor />}
          {activeTab === 'palette' && <PaletteDesigner />}
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
