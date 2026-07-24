import { useCallback, useRef, useEffect } from 'react'
import { hexToHsl, hslToHex } from '../../lib/colors.js'
import styles from './ColorPickerCompact.module.css'

const PRESET_COLORS = [
  '#ff9329', // Warm Amber
  '#ffffff', // Pure White
  '#ef4444', // Red
  '#f59e0b', // Gold
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
]

export function ColorPickerCompact({ value = '#ff8844', onChange, onCommit }) {
  const [h, s, l] = hexToHsl(value)
  const currentHexRef = useRef(value)

  useEffect(() => {
    currentHexRef.current = value
  }, [value])

  const handleHue = useCallback((e) => {
    const newH = Number(e.target.value)
    const hex = hslToHex(newH, s, l)
    currentHexRef.current = hex
    onChange?.(hex)
  }, [s, l, onChange])

  const handleSat = useCallback((e) => {
    const newS = Number(e.target.value)
    const hex = hslToHex(h, newS, l)
    currentHexRef.current = hex
    onChange?.(hex)
  }, [h, l, onChange])

  const handleLit = useCallback((e) => {
    const newL = Number(e.target.value)
    const hex = hslToHex(h, s, newL)
    currentHexRef.current = hex
    onChange?.(hex)
  }, [h, s, onChange])

  const handleCommit = useCallback(() => {
    onCommit?.(currentHexRef.current)
  }, [onCommit])

  const handleNativeColorInput = useCallback((e) => {
    const hex = e.target.value
    currentHexRef.current = hex
    onChange?.(hex)
    onCommit?.(hex)
  }, [onChange, onCommit])

  const handlePresetSelect = useCallback((hex) => {
    currentHexRef.current = hex
    onChange?.(hex)
    onCommit?.(hex)
  }, [onChange, onCommit])

  return (
    <div className={styles.wrapper} aria-label="Color picker">
      <div className={styles.row}>
        {/* Clickable color swatch opening native color picker */}
        <label className={styles.swatchLabel} title="Click to open full color picker">
          <div className={styles.swatch} style={{ background: value }} />
          <input
            type="color"
            value={value.length === 7 ? value : '#ff8844'}
            onChange={handleNativeColorInput}
            className={styles.nativeColorInput}
            aria-label="Native color picker"
          />
        </label>

        {/* HSL Sliders */}
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

      {/* Quick Preset Palette Swatches */}
      <div className={styles.presetsRow}>
        {PRESET_COLORS.map(preset => (
          <button
            key={preset}
            type="button"
            className={[styles.presetSwatch, value.toLowerCase() === preset.toLowerCase() && styles.presetActive].filter(Boolean).join(' ')}
            style={{ backgroundColor: preset }}
            onClick={() => handlePresetSelect(preset)}
            aria-label={`Select color ${preset}`}
            title={`Select ${preset}`}
          />
        ))}
      </div>
    </div>
  )
}
