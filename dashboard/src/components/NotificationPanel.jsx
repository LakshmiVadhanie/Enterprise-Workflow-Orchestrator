import { useStore } from '../store'
import styles from './NotificationPanel.module.css'

export default function NotificationPanel() {
  const notifications = useStore(s => s.notifications)
  const dismiss = useStore(s => s.dismissNotification)

  if (notifications.length === 0) return null

  return (
    <div className={styles.panel}>
      {notifications.map(n => (
        <div key={n.id} className={`${styles.notif} ${styles[n.type]}`}>
          <div className={styles.notifIcon}>
            {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : 'ℹ'}
          </div>
          <div className={styles.notifBody}>
            <div className={styles.notifTitle}>{n.title}</div>
            <div className={styles.notifMsg}>{n.message}</div>
          </div>
          <button className={styles.close} onClick={() => dismiss(n.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
