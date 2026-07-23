/**
 * WLEDashboard Spring Physics Engine
 *
 * Implements a damped harmonic oscillator for all animated values.
 * F = -kx - cv  (spring force = -stiffness * displacement - damping * velocity)
 *
 * This module provides:
 *   - useSpring()      React hook for a single animated value
 *   - useSpringGroup() React hook for animating multiple values together
 *   - springTo()       Imperative API for use outside React
 *   - SPRING_PRESETS   Named configurations from the design spec
 */

import { useRef, useState, useEffect, useCallback } from 'react'

// ─── Spring Presets ───────────────────────────────────────────────────────────
// Tuned per the design spec: stiffness, damping, mass
export const SPRING_PRESETS = {
  snappy:     { stiffness: 400, damping: 28, mass: 1.0 },
  responsive: { stiffness: 200, damping: 22, mass: 1.0 },
  gentle:     { stiffness: 120, damping: 18, mass: 1.0 },
  heavy:      { stiffness: 80,  damping: 14, mass: 1.5 },
  bouncy:     { stiffness: 300, damping: 12, mass: 0.8 },
  molasses:   { stiffness: 50,  damping: 20, mass: 2.0 },
}

// ─── Core Simulation ─────────────────────────────────────────────────────────

const SETTLE_THRESHOLD = 0.001  // px / value units
const VELOCITY_THRESHOLD = 0.001

/**
 * Advance a spring simulation by `dt` seconds.
 * Returns { position, velocity }.
 */
export function stepSpring({ position, velocity, target, stiffness, damping, mass }, dt) {
  const displacement = position - target
  const springForce  = -stiffness * displacement
  const dampingForce = -damping * velocity
  const acceleration = (springForce + dampingForce) / mass

  const newVelocity = velocity + acceleration * dt
  const newPosition = position + newVelocity * dt

  // Settle: snap to target if motion is negligible
  const settled =
    Math.abs(newPosition - target) < SETTLE_THRESHOLD &&
    Math.abs(newVelocity) < VELOCITY_THRESHOLD

  return {
    position: settled ? target : newPosition,
    velocity: settled ? 0 : newVelocity,
    settled,
  }
}

// ─── Imperative Spring Controller ─────────────────────────────────────────────

/**
 * Creates an imperative spring instance.
 * Useful for integrating with canvas / Three.js / gesture handlers.
 *
 * const spring = createSpring(0, SPRING_PRESETS.responsive)
 * spring.setTarget(100)
 * spring.onUpdate(v => element.style.transform = `translateX(${v}px)`)
 */
export function createSpring(initialValue = 0, preset = SPRING_PRESETS.responsive) {
  let position = initialValue
  let velocity = 0
  let target   = initialValue
  let config   = { ...preset }
  let rafId    = null
  let lastTime = null
  const listeners = new Set()

  function notify() {
    for (const fn of listeners) fn(position)
  }

  function tick(now) {
    if (lastTime !== null) {
      const dt = Math.min((now - lastTime) / 1000, 0.05) // cap at 50ms to avoid spiral
      const result = stepSpring({ position, velocity, target, ...config }, dt)
      position = result.position
      velocity = result.velocity
      notify()
      if (!result.settled) {
        rafId = requestAnimationFrame(tick)
        lastTime = now
        return
      }
    }
    lastTime = now
    rafId = requestAnimationFrame(tick)
  }

  function start() {
    if (rafId === null) {
      lastTime = null
      rafId = requestAnimationFrame(tick)
    }
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return {
    get value() { return position },
    get velocity() { return velocity },
    setTarget(t, inheritVelocity) {
      target = t
      if (inheritVelocity !== undefined) velocity = inheritVelocity
      start()
    },
    setConfig(c) { config = { ...config, ...c } },
    snap(v) {
      position = v
      velocity = 0
      target   = v
      notify()
    },
    onUpdate(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    destroy: stop,
  }
}

// ─── React Hook: useSpring ────────────────────────────────────────────────────

/**
 * Animates a single numeric value using spring physics.
 *
 * const [x, setX] = useSpring(0, 'responsive')
 * setX(200)  // triggers spring animation to 200
 */
export function useSpring(initialValue = 0, preset = 'responsive') {
  const config = typeof preset === 'string' ? SPRING_PRESETS[preset] : preset
  const springRef = useRef(null)
  const [value, setValue] = useState(initialValue)
  const motionReduced = useReducedMotion()

  if (!springRef.current) {
    springRef.current = createSpring(initialValue, config)
  }

  useEffect(() => {
    const unsub = springRef.current.onUpdate(setValue)
    return unsub
  }, [])

  const setTarget = useCallback((target, options = {}) => {
    if (motionReduced) {
      springRef.current.snap(target)
      setValue(target)
      return
    }
    if (options.velocity !== undefined) {
      springRef.current.setTarget(target, options.velocity)
    } else {
      springRef.current.setTarget(target)
    }
  }, [motionReduced])

  const snap = useCallback((v) => {
    springRef.current.snap(v)
    setValue(v)
  }, [])

  useEffect(() => () => springRef.current?.destroy(), [])

  return [value, setTarget, snap]
}

// ─── React Hook: useSpringGroup ───────────────────────────────────────────────

/**
 * Animates multiple named values simultaneously.
 *
 * const [vals, setVals] = useSpringGroup({ x: 0, y: 0, scale: 1 }, 'responsive')
 * setVals({ x: 100, y: 50 })
 */
export function useSpringGroup(initialValues, preset = 'responsive') {
  const config = typeof preset === 'string' ? SPRING_PRESETS[preset] : preset
  const springsRef = useRef(null)
  const [values, setValues] = useState({ ...initialValues })
  const motionReduced = useReducedMotion()

  if (!springsRef.current) {
    springsRef.current = Object.fromEntries(
      Object.entries(initialValues).map(([k, v]) => [k, createSpring(v, config)])
    )
  }

  useEffect(() => {
    const unsubs = Object.entries(springsRef.current).map(([k, spring]) =>
      spring.onUpdate(v => setValues(prev => ({ ...prev, [k]: v })))
    )
    return () => unsubs.forEach(fn => fn())
  }, [])

  const setTargets = useCallback((targets) => {
    for (const [k, v] of Object.entries(targets)) {
      if (!springsRef.current[k]) continue
      if (motionReduced) {
        springsRef.current[k].snap(v)
        setValues(prev => ({ ...prev, [k]: v }))
      } else {
        springsRef.current[k].setTarget(v)
      }
    }
  }, [motionReduced])

  useEffect(() => () => {
    Object.values(springsRef.current ?? {}).forEach(s => s.destroy())
  }, [])

  return [values, setTargets]
}

// ─── React Hook: useReducedMotion ─────────────────────────────────────────────

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

// ─── React Hook: usePresence ──────────────────────────────────────────────────

/**
 * Manages mount/unmount with spring-animated opacity and scale.
 * Returns { mounted, style } — keep the element in the DOM while exiting.
 *
 * const { mounted, style } = usePresence(isOpen, 'gentle')
 */
export function usePresence(visible, preset = 'gentle') {
  const [mounted, setMounted] = useState(visible)
  const [opacity, setOpacity] = useSpring(visible ? 1 : 0, preset)
  const [scale, setScale] = useSpring(visible ? 1 : 0.95, preset)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      // Defer so DOM is ready
      requestAnimationFrame(() => {
        setOpacity(1)
        setScale(1)
      })
    } else {
      setOpacity(0)
      setScale(0.95)
      // Unmount after animation window
      const t = setTimeout(() => setMounted(false), 350)
      return () => clearTimeout(t)
    }
  }, [visible])

  return {
    mounted,
    style: { opacity, transform: `scale(${scale})` },
  }
}

// ─── React Hook: useGestureDrag ───────────────────────────────────────────────

/**
 * Provides spring-coupled drag interaction.
 * Returns pointer event handlers and the current spring position.
 */
export function useGestureDrag({
  onDragStart,
  onDragEnd,
  axis = 'x',
  snapBack = true,
  preset = 'responsive',
} = {}) {
  const [pos, setPos] = useSpring(0, preset)
  const dragging = useRef(false)
  const origin = useRef(0)
  const velocityTracker = useRef({ last: 0, time: 0 })

  const onPointerDown = useCallback((e) => {
    dragging.current = true
    origin.current = axis === 'x' ? e.clientX : e.clientY
    velocityTracker.current = { last: 0, time: Date.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
    onDragStart?.()
  }, [axis, onDragStart])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return
    const now = Date.now()
    const delta = (axis === 'x' ? e.clientX : e.clientY) - origin.current
    const dt = now - velocityTracker.current.time || 1
    const v = (delta - velocityTracker.current.last) / (dt / 1000)
    velocityTracker.current = { last: delta, time: now }
    setPos(delta, { velocity: v })
  }, [axis, setPos])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (snapBack) setPos(0)
    onDragEnd?.({ position: pos, velocity: velocityTracker.current.last })
  }, [snapBack, setPos, pos, onDragEnd])

  return {
    position: pos,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
    isDragging: dragging.current,
  }
}
