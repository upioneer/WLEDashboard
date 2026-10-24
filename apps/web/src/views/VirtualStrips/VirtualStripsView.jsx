import { Link } from 'react-router-dom'
import { VirtualStrips } from './VirtualStrips.jsx'
import styles from './VirtualStripsView.module.css'

export function VirtualStripsView() {
  return (
    <main className={styles.page} id="main-content">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Virtual Strips</h1>
          <p className={styles.subtitle}>
            Chain controllers into continuous 1D runs. Patterns render across
            the full length and travel from member to member over DDP.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            to="/guides?topic=virtual-strips"
            className={styles.secondaryBtn}
            title="Read the virtual strips guide"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Guide
          </Link>
        </div>
      </header>
      <VirtualStrips />
    </main>
  )
}
