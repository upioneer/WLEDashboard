import { useEffect, useRef, useCallback } from 'react'
import { useSpring } from '../../lib/spring.js'
import styles from './ContextMenu.module.css'

/**
 * Generic context menu. Positions itself relative to the trigger point,
 * flips if near the viewport edge.
 *
 * Props:
 *   x, y     - pointer position to anchor to
 *   items    - [{ label, icon?, onClick, danger?, disabled?, separator? }]
 *   onClose  - called when menu should close
 */
export function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)
  const [scale, setScale] = useSpring(0.92, 'snappy')
  const [opacity, setOpacity] = useSpring(0, 'snappy')

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setScale(1)
      setOpacity(1)
    })
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [onClose])

  // Flip if near viewport edge
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuW = 200
  const menuH = items.length * 36 + 16
  const left = x + menuW > vw ? x - menuW : x
  const top  = y + menuH > vh ? y - menuH : y

  const handleItemClick = useCallback((item) => {
    if (item.disabled) return
    setScale(0.96)
    setOpacity(0)
    setTimeout(() => {
      onClose()
      item.onClick?.()
    }, 100)
  }, [onClose, setScale, setOpacity])

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{
        left,
        top,
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: `${x + menuW > vw ? 'right' : 'left'} top`,
      }}
      role="menu"
      aria-label="Device options"
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className={styles.separator} role="separator" />
        }
        return (
          <button
            key={i}
            className={[
              styles.item,
              item.danger && styles.danger,
              item.disabled && styles.itemDisabled,
            ].filter(Boolean).join(' ')}
            onClick={() => handleItemClick(item)}
            role="menuitem"
            disabled={item.disabled}
          >
            {item.icon && <span className={styles.itemIcon} aria-hidden>{item.icon}</span>}
            <span className={styles.itemLabel}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
