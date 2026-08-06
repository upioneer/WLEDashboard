import { useState, useEffect, useRef } from 'react'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { audioApi } from '../../lib/api.js'
import styles from './AudioVisualizer.module.css'

export function AudioVisualizer() {
  const devices = useDeviceStore(s => s.devices)
  const [isListening, setIsListening] = useState(false)
  const [selectedDevIp, setSelectedDevIp] = useState('')
  const [mode, setMode] = useState('bars') // 'bars' | 'pulse' | 'waveform'

  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)

  const toggleAudio = async () => {
    if (isListening) {
      stopAudio()
    } else {
      await startAudio()
    }
  }

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const AudioContext = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      setIsListening(true)
    } catch (err) {
      console.error('Failed to access microphone:', err)
    }
  }

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setIsListening(false)
  }

  useEffect(() => {
    if (!isListening) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current
    let animId = null
    let lastStreamTs = 0

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const render = () => {
      analyser.getByteFrequencyData(dataArray)
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      // Background
      ctx.fillStyle = '#0f111a'
      ctx.fillRect(0, 0, width, height)

      const barWidth = (width / bufferLength) * 1.5
      let x = 0
      const ddpPixels = []
      
      // Calculate DDP Pixels independently
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i]
        const r = Math.min(255, val * 1.2)
        const g = Math.min(255, Math.abs(128 - val) * 2)
        const b = Math.min(255, (255 - val) * 0.8)
        ddpPixels.push([Math.round(r), Math.round(g), Math.round(b)])
      }

      // Draw based on mode
      if (mode === 'waveform') {
        ctx.beginPath()
        ctx.strokeStyle = '#00ffcc'
        ctx.lineWidth = 3
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i]
          const y = height - (val / 255) * height
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += barWidth
        }
        ctx.stroke()
      } else if (mode === 'pulse') {
        let bassSum = 0
        const bassBins = Math.min(10, bufferLength)
        for (let i = 0; i < bassBins; i++) bassSum += dataArray[i]
        const avgBass = bassSum / bassBins
        
        const radius = (avgBass / 255) * (height / 1.5)
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI)
        ctx.fillStyle = `hsl(${220 + (avgBass / 255) * 100}, 90%, 60%)`
        ctx.fill()
      } else {
        // Default to 'bars'
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i]
          const barHeight = (val / 255) * height
          const hue = (i / bufferLength) * 280 + 180
          ctx.fillStyle = `hsl(${hue}, 90%, 60%)`
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight)
          x += barWidth
        }
      }

      // Stream DDP frame if target selected at max 30 FPS
      const now = Date.now()
      if (selectedDevIp && now - lastStreamTs > 33) {
        lastStreamTs = now
        audioApi.streamDdp({ target_ip: selectedDevIp, pixels: ddpPixels }).catch(() => {})
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [isListening, selectedDevIp, mode])

  return (
    <div className={styles.visualizerCard}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Real-Time Audio-Reactive Visualizer</h3>
          <p className={styles.subtitle}>
            Capture microphone or line-in audio and stream DDP frequency packets to WLED controllers.
          </p>
        </div>
        <button
          className={[styles.micBtn, isListening && styles.micBtnActive].filter(Boolean).join(' ')}
          onClick={toggleAudio}
        >
          {isListening ? 'Stop Listening' : 'Start Microphone'}
        </button>
      </div>

      {isListening && (
        <div className={styles.controlsRow}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>Target Device IP (DDP Port 4048):</label>
            <select
              value={selectedDevIp}
              onChange={e => setSelectedDevIp(e.target.value)}
              className={styles.select}
            >
              <option value="">None (Preview Canvas Only)</option>
              {devices.map(d => (
                <option key={d.id} value={d.ip_address}>
                  {d.name} ({d.ip_address})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Visualizer Mode:</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className={styles.select}>
              <option value="bars">Spectrum Bars</option>
              <option value="pulse">Bass Pulse</option>
              <option value="waveform">Frequency Waveform</option>
            </select>
          </div>
        </div>
      )}

      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} width={600} height={100} className={styles.canvas} />
      </div>
    </div>
  )
}
