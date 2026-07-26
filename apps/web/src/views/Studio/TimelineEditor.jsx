import { useState, useEffect, useRef } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './TimelineEditor.module.css'

export function TimelineEditor() {
  const animations        = useStudioStore(s => s.animations)
  const saveAnimation     = useStudioStore(s => s.saveAnimation)
  const deleteAnimation   = useStudioStore(s => s.deleteAnimation)
  const isPlaying         = useStudioStore(s => s.isPlaying)
  const playheadMs        = useStudioStore(s => s.playheadMs)
  const setPlaying        = useStudioStore(s => s.setPlaying)
  const setPlayheadMs     = useStudioStore(s => s.setPlayheadMs)
  const selectedEffectId  = useStudioStore(s => s.selectedEffectId)
  const speed             = useStudioStore(s => s.speed)
  const intensity         = useStudioStore(s => s.intensity)
  const previewColor      = useStudioStore(s => s.previewColor)
  const addToast          = useUIStore(s => s.addToast)

  const [animName, setAnimName]           = useState('Custom Wave Sequence')
  const [durationMs, setDurationMs]       = useState(5000)
  const [keyframes, setKeyframes]         = useState([
    { time_ms: 0, bri: 255, col: '#ff0055', fx: 9, sx: 128, ix: 128 },
    { time_ms: 2500, bri: 200, col: '#00ffcc', fx: 27, sx: 180, ix: 150 },
    { time_ms: 5000, bri: 255, col: '#8b5cf6', fx: 38, sx: 128, ix: 200 },
  ])

  // Timer loop for animation playback scrubber
  const timerRef = useRef(null)
  useEffect(() => {
    if (isPlaying) {
      const interval = 50
      timerRef.current = setInterval(() => {
        setPlayheadMs((prev) => {
          const next = prev + interval
          if (next >= durationMs) return 0
          return next
        })
      }, interval)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, durationMs, setPlayheadMs])

  const handleAddKeyframe = () => {
    const newKf = {
      time_ms: Math.round(playheadMs),
      bri: 255,
      col: previewColor,
      fx: selectedEffectId,
      sx: speed,
      ix: intensity,
    }
    const updated = [...keyframes, newKf].sort((a, b) => a.time_ms - b.time_ms)
    setKeyframes(updated)
    addToast({ message: `Added keyframe at ${Math.round(playheadMs)}ms`, type: 'success' })
  }

  const handleDeleteKeyframe = (index) => {
    setKeyframes(keyframes.filter((_, i) => i !== index))
  }

  const handleSaveTimeline = async () => {
    if (!animName.trim()) return
    try {
      await saveAnimation({
        name: animName.trim(),
        duration_ms: durationMs,
        timeline: keyframes,
      })
      addToast({ message: `Timeline animation "${animName}" saved`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to save timeline animation', type: 'error' })
    }
  }

  const handleLoadAnimation = (anim) => {
    setAnimName(anim.name)
    setDurationMs(anim.duration_ms || 5000)
    setKeyframes(anim.timeline || [])
    setPlayheadMs(0)
    addToast({ message: `Loaded timeline "${anim.name}"`, type: 'info' })
  }

  return (
    <div className={styles.container}>
      {/* Player Header Controls */}
      <div className={styles.toolbarCard}>
        <div className={styles.nameRow}>
          <input
            type="text"
            value={animName}
            onChange={e => setAnimName(e.target.value)}
            placeholder="Animation Name..."
            className={styles.nameInput}
          />
          <div className={styles.durationGroup}>
            <label className={styles.label}>Duration (ms):</label>
            <input
              type="number"
              step="500"
              min="1000"
              max="60000"
              value={durationMs}
              onChange={e => setDurationMs(Number(e.target.value))}
              className={styles.durationInput}
            />
          </div>
          <button className={styles.saveBtn} onClick={handleSaveTimeline}>Save Sequence</button>
        </div>

        {/* Playhead Controls */}
        <div className={styles.playerRow}>
          <button
            className={[styles.playBtn, isPlaying && styles.playBtnActive].filter(Boolean).join(' ')}
            onClick={() => setPlaying(!isPlaying)}
          >
            {isPlaying ? 'Pause' : 'Play Sequence'}
          </button>
          <button className={styles.stopBtn} onClick={() => { setPlaying(false); setPlayheadMs(0) }}>
            Reset (0ms)
          </button>

          <div className={styles.playheadTime}>
            Time: <strong>{Math.round(playheadMs)}ms</strong> / {durationMs}ms
          </div>

          <button className={styles.addKfBtn} onClick={handleAddKeyframe}>
            + Keyframe @ {Math.round(playheadMs)}ms
          </button>
        </div>
      </div>

      {/* Visual Multi-Track Timeline */}
      <div className={styles.timelineCard}>
        <div className={styles.trackHeader}>
          <span>Keyframe Timeline Track</span>
          <span className={styles.hint}>Click track to jump playhead</span>
        </div>

        <div
          className={styles.trackRuler}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            setPlayheadMs(pct * durationMs)
          }}
        >
          {/* Playhead Marker */}
          <div
            className={styles.playheadMarker}
            style={{ left: `${(playheadMs / durationMs) * 100}%` }}
          />

          {/* Keyframe Nodes */}
          {keyframes.map((kf, i) => {
            const leftPct = (kf.time_ms / durationMs) * 100
            return (
              <div
                key={i}
                className={styles.keyframeNode}
                style={{ left: `${leftPct}%`, backgroundColor: kf.col || '#8b5cf6' }}
                title={`Keyframe @ ${kf.time_ms}ms (Effect #${kf.fx || 0})`}
              >
                <span className={styles.kfTime}>{kf.time_ms}ms</span>
              </div>
            )
          })}
        </div>

        {/* Keyframe Inspector List */}
        <div className={styles.kfList}>
          <h4 className={styles.listTitle}>Keyframes ({keyframes.length})</h4>
          {keyframes.map((kf, i) => (
            <div key={i} className={styles.kfRow}>
              <div className={styles.kfMeta}>
                <span className={styles.colorDot} style={{ backgroundColor: kf.col || '#8b5cf6' }} />
                <span className={styles.kfTimeText}>{kf.time_ms}ms</span>
                <span className={styles.kfDetail}>Effect #{kf.fx || 0} • Speed {kf.sx || 128}</span>
              </div>

              <button className={styles.deleteKfBtn} onClick={() => handleDeleteKeyframe(i)}>
                Delete Keyframe
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Animations List */}
      {animations.length > 0 && (
        <div className={styles.savedCard}>
          <h3 className={styles.cardTitle}>Saved Timeline Animations</h3>
          <div className={styles.animGrid}>
            {animations.map(a => (
              <div key={a.id} className={styles.animCard}>
                <div>
                  <h4 className={styles.animName}>{a.name}</h4>
                  <span className={styles.animSub}>{a.duration_ms}ms • {a.timeline?.length || 0} Keyframes</span>
                </div>
                <div className={styles.cardBtns}>
                  <button className={styles.loadBtn} onClick={() => handleLoadAnimation(a)}>Load</button>
                  <button className={styles.deleteAnimBtn} onClick={() => deleteAnimation(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
