import { useEffect, useRef } from 'react'
import { useStudioStore } from '../../stores/studioStore.js'
import styles from './PixelStripCanvas.module.css'

const PIXEL_COUNT = 60

export function PixelStripCanvas() {
  const canvasRef = useRef(null)
  const selectedEffectId = useStudioStore(s => s.selectedEffectId)
  const selectedPaletteId = useStudioStore(s => s.selectedPaletteId)
  const speed = useStudioStore(s => s.speed)
  const intensity = useStudioStore(s => s.intensity)
  const previewColor = useStudioStore(s => s.previewColor)
  const effects = useStudioStore(s => s.effects)

  const activeEffectName = effects.find(e => e.id === selectedEffectId)?.name || 'Solid'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = null
    let frame = 0

    const render = () => {
      frame += (speed / 128) * 0.8
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      // Background strip bar track
      ctx.fillStyle = '#12141f'
      ctx.beginPath()
      ctx.roundRect(0, 0, width, height, 8)
      ctx.fill()

      const pixelW = (width - 20) / PIXEL_COUNT
      const pixelH = height - 12
      const startX = 10

      for (let i = 0; i < PIXEL_COUNT; i++) {
        let r = 139, g = 92, b = 246, alpha = 1

        // Convert previewColor hex to RGB
        if (previewColor.startsWith('#') && previewColor.length === 7) {
          r = parseInt(previewColor.slice(1, 3), 16)
          g = parseInt(previewColor.slice(3, 5), 16)
          b = parseInt(previewColor.slice(5, 7), 16)
        }

        // Effect simulation algorithms
        switch (selectedEffectId) {
          case 0: // Solid
            break
          case 1: // Blink
            alpha = Math.floor(frame / 20) % 2 === 0 ? 1 : 0.1
            break
          case 2: // Breathe
            alpha = (Math.sin(frame * 0.05) + 1) / 2
            break
          case 3: // Wipe
            alpha = (i / PIXEL_COUNT) < ((frame % 60) / 60) ? 1 : 0.1
            break
          case 8: // Colorloop
          case 9: // Rainbow
            const hue = (i * 6 + frame * 3) % 360
            const rgb = hslToRgb(hue / 360, 0.9, 0.6)
            r = rgb[0]; g = rgb[1]; b = rgb[2]
            break
          case 27: // Chase
            const head = Math.floor(frame) % PIXEL_COUNT
            const dist = (i - head + PIXEL_COUNT) % PIXEL_COUNT
            alpha = dist < 8 ? (1 - dist / 8) : 0.1
            break
          case 38: // Fire 2012
            const heat = Math.sin(i * 0.3 + frame * 0.1) * 128 + 128
            r = Math.min(255, heat * 1.5)
            g = Math.min(255, heat * 0.4)
            b = 10
            break
          case 17: // Twinkle
            alpha = (Math.sin(i * 1.5 + frame * 0.2) + 1) / 2
            break
          default:
            // Dynamic wave fallback
            alpha = (Math.sin((i / PIXEL_COUNT) * Math.PI * 4 + frame * 0.1) + 1) / 2
            break
        }

        const px = startX + i * pixelW
        const py = 6

        // Draw LED pixel glow
        if (alpha > 0.15) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`
          ctx.beginPath()
          ctx.arc(px + pixelW / 2, height / 2, pixelW * 1.2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Draw LED pixel core
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.roundRect(px + 1, py, pixelW - 2, pixelH, 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [selectedEffectId, selectedPaletteId, speed, intensity, previewColor])

  return (
    <div className={styles.canvasCard}>
      <div className={styles.canvasHeader}>
        <div className={styles.statusGroup}>
          <span className={styles.liveDot} />
          <span className={styles.canvasTitle}>Live 60-Pixel LED Strip Simulator</span>
        </div>
        <div className={styles.badgeGroup}>
          <span className={styles.effectBadge}>{activeEffectName}</span>
          <span className={styles.paramBadge}>Speed: {speed}</span>
          <span className={styles.paramBadge}>Intensity: {intensity}</span>
        </div>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={860} height={42} className={styles.canvasElement} />
      </div>
    </div>
  )
}

function hslToRgb(h, s, l) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
