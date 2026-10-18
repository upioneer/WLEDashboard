import { useEffect, useMemo, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { resolveBackgroundColor, withAlpha } from '../../lib/background.js'
import { hexToRgb } from '../../lib/colors.js'
import styles from './AmbientBackground.module.css'

export function AmbientBackground() {
  const background = useUIStore(s => s.background)
  const devices = useDeviceStore(s => s.devices)
  const groups = useGroupStore(s => s.groups)
  const color = resolveBackgroundColor(background, { devices, groups })

  if (!background || background.pattern === 'none') return null

  return (
    <div className={styles.layer} aria-hidden="true">
      {background.pattern === 'matrix' ? (
        <MatrixRain color={color} />
      ) : background.pattern === 'waves' ? (
        <WavesSvg color={color} />
      ) : background.pattern === 'shapes' ? (
        <ShapesSvg color={color} />
      ) : (
        <div className={[styles.static, background.pattern === 'aurora' && styles.aurora].filter(Boolean).join(' ')} style={staticStyle(background.pattern, color)} />
      )}
    </div>
  )
}

function staticStyle(pattern, color) {
  switch (pattern) {
    case 'dots':
      return {
        backgroundImage: `radial-gradient(${withAlpha(color, 0.16)} 1.2px, transparent 1.3px)`,
        backgroundSize: '26px 26px',
      }
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${withAlpha(color, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(color, 0.07)} 1px, transparent 1px)`,
        backgroundSize: '34px 34px',
      }
    case 'stripes':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${withAlpha(color, 0.07)} 0 2px, transparent 2px 16px)`,
      }
    case 'aurora':
      return {
        backgroundImage: `radial-gradient(42% 34% at 18% 22%, ${withAlpha(color, 0.16)}, transparent 70%), radial-gradient(38% 30% at 82% 30%, ${withAlpha('#38bdf8', 0.1)}, transparent 70%), radial-gradient(46% 36% at 55% 88%, ${withAlpha(color, 0.1)}, transparent 70%)`,
      }
    default:
      return {}
  }
}

function wavePath(width, baseY, amp, len, phase) {
  let d = `M0,${baseY.toFixed(1)}`
  for (let x = 20; x <= width; x += 20) {
    d += ` L${x},${(baseY + Math.sin((x / len) * Math.PI * 2 + phase) * amp).toFixed(1)}`
  }
  return d
}

function WavesSvg({ color }) {
  const paths = useMemo(() => [
    { d: wavePath(1440, 220, 46, 640, 0), alpha: 0.1, width: 2 },
    { d: wavePath(1440, 470, 62, 520, 1.4), alpha: 0.07, width: 2 },
    { d: wavePath(1440, 700, 40, 760, 2.6), alpha: 0.05, width: 2 },
  ], [])
  return (
    <svg className={styles.full} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={withAlpha(color, p.alpha)} strokeWidth={p.width} />
      ))}
    </svg>
  )
}

const SHAPES = [
  { kind: 'circle', x: 120, y: 140, r: 46 },
  { kind: 'circle', x: 1290, y: 210, r: 30 },
  { kind: 'circle', x: 760, y: 720, r: 58 },
  { kind: 'rect', x: 420, y: 320, s: 64, rotate: 18 },
  { kind: 'rect', x: 1080, y: 560, s: 44, rotate: -12 },
  { kind: 'rect', x: 180, y: 640, s: 36, rotate: 30 },
  { kind: 'triangle', x: 940, y: 160, s: 72 },
  { kind: 'triangle', x: 320, y: 560, s: 52 },
  { kind: 'triangle', x: 1240, y: 740, s: 60 },
  { kind: 'ring', x: 620, y: 180, r: 26 },
  { kind: 'ring', x: 180, y: 380, r: 18 },
  { kind: 'ring', x: 1120, y: 380, r: 34 },
]

function ShapesSvg({ color }) {
  return (
    <svg className={styles.full} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      {SHAPES.map((s, i) => {
        if (s.kind === 'circle') {
          return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={withAlpha(color, 0.05)} stroke={withAlpha(color, 0.09)} strokeWidth={2} />
        }
        if (s.kind === 'ring') {
          return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="none" stroke={withAlpha(color, 0.1)} strokeWidth={2} />
        }
        if (s.kind === 'rect') {
          return <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} rx={8} fill="none" stroke={withAlpha(color, 0.09)} strokeWidth={2} transform={`rotate(${s.rotate} ${s.x + s.s / 2} ${s.y + s.s / 2})`} />
        }
        const h = s.s * 0.866
        return <polygon key={i} points={`${s.x},${s.y - h / 2} ${s.x - s.s / 2},${s.y + h / 2} ${s.x + s.s / 2},${s.y + h / 2}`} fill="none" stroke={withAlpha(color, 0.09)} strokeWidth={2} strokeLinejoin="round" />
      })}
    </svg>
  )
}

const MATRIX_GLYPHS = '01アイウエオカキクケコサシスセソ0123456789ABCDEF#$*+-'

function MatrixRain({ color }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const [r, g, b] = hexToRgb(color)
    const cell = 18
    let cols = 0
    let drops = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.max(1, Math.ceil(canvas.width / cell))
      drops = Array.from({ length: cols }, () => Math.random() * (canvas.height / cell))
      ctx.fillStyle = '#05060c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let tick = 0

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 6, 12, 0.14)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = '15px monospace'
      for (let i = 0; i < cols; i++) {
        const ch = MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0]
        ctx.fillStyle = Math.random() < 0.05
          ? 'rgba(255, 255, 255, 0.45)'
          : `rgba(${r}, ${g}, ${b}, 0.5)`
        ctx.fillText(ch, i * cell, drops[i] * cell)
        if (drops[i] * cell > canvas.height && Math.random() > 0.976) drops[i] = 0
        drops[i]++
      }
    }

    if (reduced) {
      draw()
    } else {
      const loop = () => {
        tick++
        if (tick % 3 === 0) draw()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [color])

  return <canvas ref={ref} className={styles.matrix} />
}
