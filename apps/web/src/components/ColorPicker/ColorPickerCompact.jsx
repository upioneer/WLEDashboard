import { useCallback, useState } from 'react'
import { hexToHsl, hslToHex } from '../../lib/colors.js'
import styles from './ColorPickerCompact.module.css'

/**
 * ColorPickerCompact — inline HSL strip layout.
 * Shows a hue bar, saturation slider, and lightness slider.
 * Fits inside a device card without a popover.
 *
 * Props:
 *   value    - hex color string
 *   onChange - called with hex color on every change
 *   onCommit - called on pointerup (send to API)
 */
export function ColorPickerCompact({ value = '#ff8844', onChange, onCommit }) {
  const [h, s, l] = hexToHsl(value)

  const commit = useCallback((hex) => {
    onCommit?.(hex)
  }, [onCommit])

  const handleHue = useCallback((e) => {
    const newH = Number(e.target.value)
    const hex = hslToHex(newH, s, l)
    onChange?.(hex)
  }, [s, l, onChange])

  const handleSat = useCallback((e) => {
    const newS = Number(e.target.value)
    const hex = hslToHex(h, newS, l)
    onChange?.(hex)
  }, [h, l, onChange])

  const handleLit = useCallback((e) => {
    const newL = Number(e.target.value)
    const hex = hslToHex(h, s, newL)
    onChange?.(hex)
  }, [h, s, onChange])

  const handleCommit = useCallback(() => {
    commit(value)
  }, [commit, value])

  return (
    <div className={styles.wrapper} aria-label="Color picker">
      {/* Hue bar */}
      <div className={styles.row}>
        <div className={styles.swatch} style={{ background: value }} aria-hidden />
        <div className={styles.sliders}>
          <div className={styles.hueTrack}>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={h}
              onChange={handleHue}
              onPointerUp={handleCommit}
              className={[styles.rangeInput, styles.hueInput].join(' ')}
              aria-label="Hue"
            />
          </div>
          <div className={styles.satLitRow}>
            <div
              className={styles.satTrack}
              style={{
                background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`,
              }}
            >
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={s}
                onChange={handleSat}
                onPointerUp={handleCommit}
                className={styles.rangeInput}
                aria-label="Saturation"
              />
            </div>
            <div
              className={styles.litTrack}
              style={{
                background: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`,
              }}
            >
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={l}
                onChange={handleLit}
                onPointerUp={handleCommit}
                className={styles.rangeInput}
                aria-label="Lightness"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
