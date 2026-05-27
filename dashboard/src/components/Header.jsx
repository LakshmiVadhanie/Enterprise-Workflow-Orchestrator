import { useStore } from '../store'
import styles from './Header.module.css'
import { format } from 'date-fns'

export default function Header() {
  const toggleSidebar = useStore(s => s.toggleSidebar)
  const wsConnected = useStore(s => s.wsConnected)
  const liveUpdates = useStore(s => s.liveUpdates)

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={toggleSidebar} title="Toggle sidebar">
          <span /><span /><span />
        </button>
        <div className={styles.breadcrumb}>
          <span className={styles.systemId}>SYS-001</span>
          <span className={styles.sep}>›</span>
          <span className={styles.pageName}>Workflow Orchestrator</span>
        </div>
      </div>

      <div className={styles.right}>
        {/* Live indicator */}
        <div className={`${styles.liveChip} ${wsConnected ? styles.live : styles.offline}`}>
          <span className={styles.liveDot} />
          <span>{wsConnected ? `LIVE · ${liveUpdates.length} events` : 'OFFLINE'}</span>
        </div>

        {/* Clock */}
        <div className={styles.clock}>
          <span className={styles.clockTime}>
            {format(new Date(), 'HH:mm:ss')}
          </span>
          <span className={styles.clockDate}>
            {format(new Date(), 'MMM dd, yyyy')}
          </span>
        </div>

        {/* User avatar */}
        <div className={styles.avatar}>
          <span>AD</span>
        </div>
      </div>
    </header>
  )
}
