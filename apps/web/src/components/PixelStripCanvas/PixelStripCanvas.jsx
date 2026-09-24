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

    // Parse base preview color
    let baseR = 139, baseG = 92, baseB = 246
    if (previewColor && previewColor.startsWith('#') && previewColor.length === 7) {
      baseR = parseInt(previewColor.slice(1, 3), 16)
      baseG = parseInt(previewColor.slice(3, 5), 16)
      baseB = parseInt(previewColor.slice(5, 7), 16)
    }

    const render = () => {
      // Speed multiplier (0..255)
      const speedMult = Math.max(0.05, (speed / 128) * 0.8)
      frame += speedMult

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

      // Intensity factor (0..1)
      const intFact = intensity / 255

      for (let i = 0; i < PIXEL_COUNT; i++) {
        // Sample color from active palette or base previewColor
        const [palR, palG, palB] = samplePalette(
          selectedPaletteId,
          (i / PIXEL_COUNT) + (frame * 0.003),
          [baseR, baseG, baseB]
        )

        let r = palR
        let g = palG
        let b = palB
        let alpha = 1

        // ─── 50 Authentic WLED Effect Simulation Algorithms ─────────────
        switch (selectedEffectId) {
          case 0: { // Solid
            alpha = 1
            break
          }
          case 1: { // Blink
            const period = Math.max(6, 50 - (speed / 255) * 38)
            alpha = (frame % period) < (period * 0.5) ? 1 : 0.04
            break
          }
          case 2: { // Breathe
            const brVal = (Math.sin(frame * 0.06) + 1) / 2
            alpha = 0.05 + 0.95 * Math.pow(brVal, 1.6)
            break
          }
          case 3: { // Wipe
            const progress = (frame % 70) / 70
            alpha = (i / PIXEL_COUNT) <= progress ? 1 : 0.05
            break
          }
          case 4: { // Wipe Random
            const pass = Math.floor(frame / 70)
            const progress = (frame % 70) / 70
            const wipeHue = (pass * 77) % 360
            const [wrR, wrG, wrB] = hslToRgb(wipeHue / 360, 0.95, 0.55)
            r = wrR; g = wrG; b = wrB
            alpha = (i / PIXEL_COUNT) <= progress ? 1 : 0.05
            break
          }
          case 5: { // Random Colors
            const pSeed = Math.sin(i * 12.9898 + Math.floor(frame * 0.05) * 43.23)
            const rHue = Math.abs(Math.sin(pSeed) * 360)
            const [rcR, rcG, rcB] = hslToRgb(rHue / 360, 0.9, 0.55)
            r = rcR; g = rcG; b = rcB
            alpha = 0.9
            break
          }
          case 6: { // Sweep
            const sweepPos = ((Math.sin(frame * 0.05) + 1) / 2) * PIXEL_COUNT
            const dist = Math.abs(i - sweepPos)
            const beamWidth = 3 + intFact * 8
            alpha = Math.max(0.06, 1 - dist / beamWidth)
            break
          }
          case 7: { // Dynamic
            const noise = Math.sin(i * 0.25 + frame * 0.05) * Math.cos(i * 0.12 - frame * 0.04)
            alpha = 0.2 + 0.8 * ((noise + 1) / 2)
            break
          }
          case 8: { // Colorloop
            const loopHue = (frame * 1.5) % 360
            const [clR, clG, clB] = hslToRgb(loopHue / 360, 0.9, 0.55)
            r = clR; g = clG; b = clB
            alpha = 1
            break
          }
          case 9: { // Rainbow
            const rHue = ((i / PIXEL_COUNT) * 360 + frame * 2.5) % 360
            const [rbR, rbG, rbB] = hslToRgb(rHue / 360, 0.95, 0.55)
            r = rbR; g = rbG; b = rbB
            alpha = 1
            break
          }
          case 10: { // Scan (Knight Rider)
            const scanPos = ((Math.sin(frame * 0.06) + 1) / 2) * (PIXEL_COUNT - 1)
            const sDist = Math.abs(i - scanPos)
            const beam = 2 + intFact * 4
            alpha = Math.max(0.04, 1 - sDist / beam)
            break
          }
          case 11: { // Dual Scan
            const pA = ((Math.sin(frame * 0.06) + 1) / 2) * (PIXEL_COUNT - 1)
            const pB = (PIXEL_COUNT - 1) - pA
            const dA = Math.abs(i - pA)
            const dB = Math.abs(i - pB)
            alpha = Math.max(0.04, Math.max(1 - dA / 3.5, 1 - dB / 3.5))
            break
          }
          case 12: { // Fade
            const fVal = (Math.sin(frame * 0.04) + 1) / 2
            alpha = Math.max(0.03, fVal)
            break
          }
          case 13: { // Theater
            const tStep = Math.floor(frame * 0.3) % 3
            alpha = (i + tStep) % 3 === 0 ? 1 : 0.06
            break
          }
          case 14: { // Theater Rainbow
            const tStep = Math.floor(frame * 0.3) % 3
            const trHue = (i * 6 + frame * 2) % 360
            const [trR, trG, trB] = hslToRgb(trHue / 360, 0.95, 0.55)
            r = trR; g = trG; b = trB
            alpha = (i + tStep) % 3 === 0 ? 1 : 0.06
            break
          }
          case 15: { // Running
            const runVal = Math.sin((i / PIXEL_COUNT) * 12 - frame * 0.15)
            alpha = 0.08 + 0.92 * ((runVal + 1) / 2)
            break
          }
          case 16: { // Saw
            const sawPos = ((i - frame * 0.5) % 15 + 15) % 15
            alpha = 0.05 + 0.95 * (sawPos / 15)
            break
          }
          case 17: { // Twinkle
            const twThresh = 0.85 - intFact * 0.4
            const twPhase = Math.sin(i * 19.3 + frame * 0.15)
            alpha = twPhase > twThresh ? (twPhase - twThresh) / (1 - twThresh) : 0.05
            break
          }
          case 18: { // Dissolve
            const dHash = Math.abs(Math.sin(i * 91.3 + Math.floor(frame * 0.06) * 7.7) * 10000) % 1
            alpha = dHash > 0.4 ? (Math.sin(frame * 0.2 + i) + 1) / 2 : 0.05
            break
          }
          case 19: { // Sparkle
            const spk = Math.sin(i * 47.1 + frame * 0.9)
            if (spk > (0.98 - intFact * 0.06)) {
              r = 255; g = 255; b = 255; alpha = 1
            } else {
              alpha = 0.25
            }
            break
          }
          case 20: { // Sparkle Dark
            const spkDark = Math.sin(i * 47.1 + frame * 0.9)
            alpha = spkDark > (0.97 - intFact * 0.05) ? 0.05 : 1
            break
          }
          case 21: { // Sparkle+
            const spkP = Math.sin(i * 23.4 + frame * 0.9)
            if (spkP > 0.9) {
              r = 255; g = 255; b = 255; alpha = 1
            } else if (spkP > 0.6) {
              alpha = 0.75
            } else {
              alpha = 0.12
            }
            break
          }
          case 22: { // Strobe
            const strPer = Math.max(6, 42 - (speed / 255) * 34)
            const strOn = (frame % strPer) < 2
            alpha = strOn ? 1 : 0.02
            break
          }
          case 23: { // Strobe Rainbow
            const strPer = Math.max(6, 42 - (speed / 255) * 34)
            const strOn = (frame % strPer) < 2
            const bCount = Math.floor(frame / strPer)
            const sHue = (bCount * 55) % 360
            const [srR, srG, srB] = hslToRgb(sHue / 360, 0.95, 0.6)
            r = srR; g = srG; b = srB
            alpha = strOn ? 1 : 0.02
            break
          }
          case 24: { // Mega Strobe
            const mPhase = frame % 60
            const isBurst = (mPhase < 26) && (Math.floor(mPhase / 3) % 2 === 0)
            alpha = isBurst ? 1 : 0.02
            break
          }
          case 25: { // Blink Rainbow
            const bPer = 32
            const bOn = (frame % bPer) < 16
            const bPass = Math.floor(frame / bPer)
            const [brkR, brkG, brkB] = hslToRgb(((bPass * 65) % 360) / 360, 0.92, 0.55)
            r = brkR; g = brkG; b = brkB
            alpha = bOn ? 1 : 0.04
            break
          }
          case 26: { // Android
            const aPos = ((Math.sin(frame * 0.04) + 1) / 2) * (PIXEL_COUNT - 1)
            const aDist = Math.abs(i - aPos)
            r = 0; g = 235; b = 215
            alpha = Math.max(0.04, 1 - aDist / 5.5)
            break
          }
          case 27: { // Chase
            const cHead = (frame * 0.65) % PIXEL_COUNT
            const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
            const cLen = 5 + intFact * 12
            alpha = cDist < cLen ? Math.pow(1 - cDist / cLen, 1.8) : 0.04
            break
          }
          case 28: { // Chase Random
            const lap = Math.floor((frame * 0.65) / PIXEL_COUNT)
            const [crdR, crdG, crdB] = hslToRgb(((lap * 83) % 360) / 360, 0.95, 0.55)
            r = crdR; g = crdG; b = crdB
            const cHead = (frame * 0.65) % PIXEL_COUNT
            const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
            alpha = cDist < 9 ? Math.pow(1 - cDist / 9, 1.5) : 0.04
            break
          }
          case 29: { // Chase Rainbow
            const cHead = (frame * 0.65) % PIXEL_COUNT
            const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
            const [crbR, crbG, crbB] = hslToRgb(((i * 7 + frame * 3) % 360) / 360, 0.95, 0.55)
            r = crbR; g = crbG; b = crbB
            alpha = cDist < 11 ? (1 - cDist / 11) : 0.04
            break
          }
          case 30: { // Chase Flash
            const cHead = (frame * 0.7) % PIXEL_COUNT
            if (cHead > PIXEL_COUNT - 3) {
              r = 255; g = 255; b = 255; alpha = 1
            } else {
              const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
              alpha = cDist < 8 ? (1 - cDist / 8) : 0.04
            }
            break
          }
          case 31: { // Chase Flash Random
            const cHead = (frame * 0.7) % PIXEL_COUNT
            const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
            const [cfrR, cfrG, cfrB] = hslToRgb(((Math.floor(frame / 60) * 137) % 360) / 360, 0.9, 0.55)
            r = cfrR; g = cfrG; b = cfrB
            alpha = cDist < 8 ? (1 - cDist / 8) : 0.04
            break
          }
          case 32: { // Chase Rainbow Flash
            const cHead = (frame * 0.8) % PIXEL_COUNT
            const cDist = (i - cHead + PIXEL_COUNT) % PIXEL_COUNT
            if (cDist === 0) {
              r = 255; g = 255; b = 255; alpha = 1
            } else if (cDist < 10) {
              const [crfR, crfG, crfB] = hslToRgb(((i * 8 + frame * 2) % 360) / 360, 0.95, 0.55)
              r = crfR; g = crfG; b = crfB
              alpha = 1 - cDist / 10
            } else {
              alpha = 0.04
            }
            break
          }
          case 33: { // Chase Blackout (inverse chase)
            const bHead = (frame * 0.6) % PIXEL_COUNT
            const bDist = (i - bHead + PIXEL_COUNT) % PIXEL_COUNT
            alpha = bDist < 7 ? (bDist / 7) * 0.9 : 1
            break
          }
          case 34: { // Chaser Flash
            const chPos = (frame * 0.9) % 10
            alpha = (i % 10 === Math.floor(chPos)) ? 1 : 0.05
            break
          }
          case 35: { // Fireworks
            const fCycle = frame % 70
            if (fCycle < 30) {
              const rPos = (fCycle / 30) * PIXEL_COUNT
              const rDist = Math.abs(i - rPos)
              alpha = rDist < 3 ? 1 - rDist / 3 : 0.04
            } else {
              const exCenter = PIXEL_COUNT * 0.72
              const exRad = (fCycle - 30) * 0.55
              const exDist = Math.abs(i - exCenter)
              if (Math.abs(exDist - exRad) < 2.5) {
                r = 255; g = 210; b = 80
                alpha = Math.max(0.04, 1 - (fCycle - 30) / 40)
              } else {
                alpha = 0.04
              }
            }
            break
          }
          case 36: { // Fireworks Random
            const fwCycle = frame % 55
            const fwCenter = ((Math.floor(frame / 55) * 37) % (PIXEL_COUNT - 20)) + 10
            const fwRad = fwCycle * 0.5
            const fwDist = Math.abs(i - fwCenter)
            const [fwrR, fwrG, fwrB] = hslToRgb(((Math.floor(frame / 55) * 89) % 360) / 360, 0.95, 0.6)
            r = fwrR; g = fwrG; b = fwrB
            alpha = Math.abs(fwDist - fwRad) < 2.5 ? Math.max(0.04, 1 - fwCycle / 55) : 0.04
            break
          }
          case 37: { // Merry Christmas
            const isRed = Math.floor((i + Math.floor(frame * 0.08)) / 4) % 2 === 0
            if (isRed) {
              r = 240; g = 15; b = 25
            } else {
              r = 15; g = 215; b = 45
            }
            const mcTw = (Math.sin(i * 7 + frame * 0.2) + 1) / 2
            alpha = 0.35 + 0.65 * mcTw
            break
          }
          case 38: { // Fire 2012
            const heat = Math.sin(i * 0.25 - frame * 0.15) * 60 + Math.cos(i * 0.4 + frame * 0.08) * 40 + 150
            r = Math.min(255, heat * 1.6)
            g = Math.min(255, Math.max(0, (heat - 80) * 1.8))
            b = Math.min(255, Math.max(0, (heat - 180) * 2))
            alpha = Math.max(0.15, heat / 255)
            break
          }
          case 39: { // Flicker
            const flk = Math.sin(frame * 0.4 + i * 0.5) * 0.25 + Math.sin(frame * 0.9 + i * 1.1) * 0.25
            alpha = Math.max(0.12, Math.min(1, 0.7 + flk))
            break
          }
          case 40: { // Pacifica
            const wave1 = Math.sin(i * 0.15 + frame * 0.04)
            const wave2 = Math.cos(i * 0.22 - frame * 0.06)
            const swell = (wave1 + wave2 + 2) / 4
            r = Math.round(5 + 20 * swell)
            g = Math.round(80 + 130 * swell)
            b = Math.round(180 + 75 * swell)
            alpha = 0.3 + 0.7 * swell
            break
          }
          case 41: { // Candle
            const cFlick = Math.sin(frame * 0.3) * 0.1 + Math.sin(frame * 0.7) * 0.15 + Math.sin(frame * 1.3) * 0.08
            r = 255
            g = Math.round(135 + cFlick * 40)
            b = 15
            alpha = Math.max(0.2, Math.min(1, 0.8 + cFlick))
            break
          }
          case 42: { // Lightning
            const lCycle = frame % 110
            const isStrike = lCycle < 18 && (Math.sin(lCycle * 2.5) > 0.2)
            if (isStrike) {
              r = 240; g = 245; b = 255; alpha = 1
            } else {
              alpha = 0.03
            }
            break
          }
          case 43: { // ICU
            const eyePos = ((Math.sin(frame * 0.03) + 1) / 2) * (PIXEL_COUNT - 6)
            const eyeA = Math.floor(eyePos)
            const eyeB = eyeA + 3
            const isEye = (i === eyeA || i === eyeB)
            const isBlink = Math.sin(frame * 0.05) > 0.88
            if (isEye && !isBlink) {
              r = 0; g = 255; b = 120; alpha = 1
            } else {
              alpha = 0.03
            }
            break
          }
          case 44: { // Multi Comet
            let maxA = 0.04
            for (let c = 0; c < 3; c++) {
              const head = (frame * 0.5 + c * (PIXEL_COUNT / 3)) % PIXEL_COUNT
              const dist = (i - head + PIXEL_COUNT) % PIXEL_COUNT
              if (dist < 8) maxA = Math.max(maxA, 1 - dist / 8)
            }
            alpha = maxA
            break
          }
          case 45: { // Dual Scanner
            const dsA = ((Math.sin(frame * 0.05) + 1) / 2) * (PIXEL_COUNT - 1)
            const dsB = (PIXEL_COUNT - 1) - dsA
            const d1 = Math.abs(i - dsA)
            const d2 = Math.abs(i - dsB)
            alpha = Math.max(0.04, Math.max(1 - d1 / 4, 1 - d2 / 4))
            break
          }
          case 46: { // Stream
            const strPos = (i * 0.5 - frame * 0.4) % 6
            alpha = (strPos < 0 ? strPos + 6 : strPos) < 2.5 ? 0.95 : 0.08
            break
          }
          case 47: { // Glitter
            const hasGlitter = Math.sin(i * 37.1 + frame * 0.6) > (0.95 - intFact * 0.05)
            if (hasGlitter) {
              r = 255; g = 240; b = 160; alpha = 1
            } else {
              alpha = 0.65
            }
            break
          }
          case 48: { // Sunrise
            const sunProg = (Math.sin(frame * 0.02) + 1) / 2
            r = Math.round(180 + 75 * sunProg)
            g = Math.round(30 + 180 * sunProg)
            b = Math.round(10 + 120 * sunProg)
            alpha = 0.2 + 0.8 * sunProg
            break
          }
          case 49: { // Colorwaves
            const cw1 = Math.sin(i * 0.12 + frame * 0.05)
            const cw2 = Math.cos(i * 0.18 - frame * 0.03)
            const cwHue = ((cw1 + cw2 + 2) * 90 + frame) % 360
            const [cwR, cwG, cwB] = hslToRgb(cwHue / 360, 0.9, 0.55)
            r = cwR; g = cwG; b = cwB
            alpha = 0.35 + 0.65 * ((cw1 + 1) / 2)
            break
          }
          default: {
            alpha = (Math.sin((i / PIXEL_COUNT) * Math.PI * 4 + frame * 0.1) + 1) / 2
            break
          }
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

function samplePalette(paletteId, pos, baseRgb) {
  const p = ((pos % 1) + 1) % 1
  switch (paletteId) {
    case 6: { // Party
      return hslToRgb((p * 360) / 360, 1.0, 0.55)
    }
    case 7: { // Cloud
      if (p < 0.5) return lerpColor([255, 255, 255], [130, 200, 255], p * 2)
      return lerpColor([130, 200, 255], [40, 120, 220], (p - 0.5) * 2)
    }
    case 8: { // Lava
      if (p < 0.33) return lerpColor([25, 0, 0], [220, 20, 0], p / 0.33)
      if (p < 0.66) return lerpColor([220, 20, 0], [255, 120, 0], (p - 0.33) / 0.33)
      return lerpColor([255, 120, 0], [255, 240, 50], (p - 0.66) / 0.34)
    }
    case 9: { // Ocean
      if (p < 0.4) return lerpColor([5, 15, 60], [10, 80, 180], p / 0.4)
      if (p < 0.8) return lerpColor([10, 80, 180], [0, 220, 220], (p - 0.4) / 0.4)
      return lerpColor([0, 220, 220], [230, 255, 255], (p - 0.8) / 0.2)
    }
    case 10: { // Forest
      if (p < 0.5) return lerpColor([10, 50, 15], [30, 160, 45], p * 2)
      return lerpColor([30, 160, 45], [160, 230, 50], (p - 0.5) * 2)
    }
    case 11: // Rainbow
    case 12: { // Rainbow Bands
      return hslToRgb(p, 0.95, 0.55)
    }
    case 13: { // Sunset
      if (p < 0.33) return lerpColor([60, 10, 90], [200, 20, 110], p / 0.33)
      if (p < 0.66) return lerpColor([200, 20, 110], [255, 90, 20], (p - 0.33) / 0.33)
      return lerpColor([255, 90, 20], [255, 200, 40], (p - 0.66) / 0.34)
    }
    case 18: { // Cyberpunk
      if (p < 0.5) return lerpColor([255, 0, 128], [140, 0, 255], p * 2)
      return lerpColor([140, 0, 255], [0, 240, 255], (p - 0.5) * 2)
    }
    case 19: { // Amber Glow
      if (p < 0.5) return lerpColor([180, 50, 0], [255, 140, 0], p * 2)
      return lerpColor([255, 140, 0], [255, 220, 80], (p - 0.5) * 2)
    }
    default:
      return baseRgb
  }
}

function lerpColor(c1, c2, t) {
  const clampT = Math.max(0, Math.min(1, t))
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * clampT),
    Math.round(c1[1] + (c2[1] - c1[1]) * clampT),
    Math.round(c1[2] + (c2[2] - c1[2]) * clampT),
  ]
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
  let tempT = t
  if (tempT < 0) tempT += 1
  if (tempT > 1) tempT -= 1
  if (tempT < 1 / 6) return p + (q - p) * 6 * tempT
  if (tempT < 1 / 2) return q
  if (tempT < 2 / 3) return p + (q - p) * (2 / 3 - tempT) * 6
  return p
}
