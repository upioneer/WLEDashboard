import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStripStore } from '../../stores/stripStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { sortedByName } from '../../lib/sort.js'
import styles from './StripPerformer.module.css'

const DEFAULT_PLAY = { pattern: 'chase', params: { color1: [139, 92, 246], speed: 128, direction: 1 } }

// Slim Studio companion to the full Virtual Strips page: replay each strip's
// last performance (or a default chase) without leaving the show context.
export function StripPerformer() {
  const strips = useStripStore(s => s.strips)
  const fetchStrips = useStripStore(s => s.fetchStrips)
  const playStrip = useStripStore(s => s.playStrip)
  const stopStrip = useStripStore(s => s.stopStrip)
  const addToast = useUIStore(s => s.addToast)

  useEffect(() => {
    fetchStrips()
  }, [fetchStrips])

  const handlePlay = async (strip) => {
    try {
      await playStrip(strip.id, strip.last_play ?? DEFAULT_PLAY)
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    }
  }

  const handleStop = async (id) => {
    try {
      await stopStrip(id)
    } catch (err) {
      addToast({ message: err.message, type: 'error' })
    }
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Virtual Strips</h3>
      <p className={styles.cardDesc}>
        Play or stop a strip right here. Build and edit strips on the
        full <Link to="/strips" className={styles.inlineLink}>Virtual Strips</Link> page.
      </p>
      {strips.length === 0 ? (
        <p className={styles.cardDesc}>
          No virtual strips yet.{' '}
          <Link to="/strips" className={styles.inlineLink}>Create one</Link> to get started.
        </p>
      ) : (
        <ul className={styles.stripList}>
          {sortedByName(strips).map(s => (
            <li key={s.id} className={styles.stripRow}>
              <span className={[styles.dot, s.playing ? styles.dotOn : styles.dotOff].join(' ')} />
              <span className={styles.stripName}>{s.name}</span>
              <span className={styles.stripMeta}>
                {s.total_leds} LEDs • {s.members.length} member{s.members.length === 1 ? '' : 's'}
              </span>
              {s.playing ? (
                <button type="button" className={styles.stopBtn} onClick={() => handleStop(s.id)}>
                  Stop
                </button>
              ) : (
                <button type="button" className={styles.primaryBtn} onClick={() => handlePlay(s)}>
                  Play
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.cardFooter}>
        <Link to="/strips" className={styles.manageLink}>Manage Virtual Strips</Link>
      </div>
    </div>
  )
}
