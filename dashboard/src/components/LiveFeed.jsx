import { useStore } from '../store'
import { formatDistanceToNow } from 'date-fns'
import { STATUS_COLORS } from '../utils/api'
import styles from './LiveFeed.module.css'

const EVENT_ICONS = {
  WORKFLOW_UPDATE: '⇄',
  CONNECTED: '◉',
  STATS_UPDATE: '≡',
  SERVICE_STATUS: '⊕',
  PONG: '·',
}

export default function LiveFeed() {
  const liveUpdates = useStore(s => s.liveUpdates)
  const wsConnected = useStore(s => s.wsConnected)
  const visible = liveUpdates.filter(u => u.type !== 'PONG').slice(0, 20)

  return (
    <div className={styles.feed}>
      <div className={styles.feedHeader}>
        <span className={styles.feedTitle}>Live Event Stream</span>
        <span className={`${styles.indicator} ${wsConnected ? styles.on : styles.off}`}>
          <span className={styles.dot} />
          {wsConnected ? 'STREAMING' : 'DISCONNECTED'}
        </span>
      </div>

      <div className={styles.feedBody}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◌</span>
            <span>Waiting for events…</span>
          </div>
        ) : (
          visible.map((update, i) => (
            <div key={i} className={styles.event} style={{ animationDelay: `${i * 30}ms` }}>
              <span className={styles.eventIcon}>
                {EVENT_ICONS[update.type] || '·'}
              </span>
              <div className={styles.eventContent}>
                <span
                  className={styles.eventType}
                  style={{ color: update.status ? STATUS_COLORS[update.status] : 'var(--accent-cyan)' }}
                >
                  {update.type}
                </span>
                {update.name && <span className={styles.eventName}>{update.name}</span>}
                {update.status && (
                  <span className={styles.eventStatus} style={{ color: STATUS_COLORS[update.status] }}>
                    → {update.status}
                  </span>
                )}
                {update.message && (
                  <span className={styles.eventMsg}>{update.message}</span>
                )}
              </div>
              <span className={styles.eventTime}>
                {update.timestamp
                  ? formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })
                  : 'just now'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
