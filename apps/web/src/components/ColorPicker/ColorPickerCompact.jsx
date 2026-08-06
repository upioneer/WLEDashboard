import { useCallback, useRef, useEffect } from 'react'
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
  const currentHexRef = useRef(value)

  useEffect(() => {
    currentHexRef.current = value
  }, [value])

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
        <label className={styles.swatchLabel} title="Click to open full color picker">
          <div className={styles.swatch} style={{ background: value }} />
          <input
            type="color"
            value={value.length === 7 ? value : '#ff8844'}
            onChange={handleNativeColorInput}
            className={styles.nativeColorInput}
            aria-label="Native color picker"
          />
          <span className={styles.pickerHint}>Custom Color...</span>
        </label>
      </div>

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
