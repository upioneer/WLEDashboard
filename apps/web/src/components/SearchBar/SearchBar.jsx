import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './SearchBar.module.css'

/**
 * SearchBar with debounced onChange, filter chips for online/offline.
 *
 * Props:
 *   value        - controlled search string
 *   onChange     - called with new string (debounced 200ms)
 *   filter       - 'all' | 'online' | 'offline'
 *   onFilter     - called with new filter value
 *   resultCount  - number of results to display
 */
export function SearchBar({ value, onChange, filter = 'all', onFilter, resultCount }) {
  const [local, setLocal] = useState(value ?? '')
  const timer = useRef(null)

  // Sync controlled value
  useEffect(() => { setLocal(value ?? '') }, [value])

  const handleInput = useCallback((e) => {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange?.(v), 200)
  }, [onChange])

  const handleClear = useCallback(() => {
    setLocal('')
    onChange?.('')
  }, [onChange])

  const FILTERS = [
    { value: 'all',     label: 'All' },
    { value: 'online',  label: 'Online' },
    { value: 'offline', label: 'Offline' },
  ]

  return (
    <div className={styles.wrapper} role="search">
      <div className={styles.inputRow}>
        <span className={styles.searchIcon} aria-hidden><SearchIcon /></span>
        <input
          type="search"
          value={local}
          onChange={handleInput}
          placeholder="Search devices..."
          className={styles.input}
          aria-label="Search devices"
          id="device-search"
        />
        {local && (
          <button className={styles.clearBtn} onClick={handleClear} aria-label="Clear search">
            <ClearIcon />
          </button>
        )}
      </div>

      <div className={styles.chips} role="group" aria-label="Filter by status">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={[styles.chip, filter === f.value && styles.chipActive].filter(Boolean).join(' ')}
            onClick={() => onFilter?.(f.value)}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
        {resultCount !== undefined && (
          <span className={styles.count}>{resultCount} device{resultCount !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
