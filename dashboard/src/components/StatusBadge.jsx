import { STATUS_COLORS, STATUS_BG } from '../utils/api'
import styles from './StatusBadge.module.css'

const STATUS_LABELS = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  PENDING: 'Pending',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
  WAITING_APPROVAL: 'Awaiting Approval',
  DRAFT: 'Draft',
}

export default function StatusBadge({ status, size = 'md' }) {
  const color = STATUS_COLORS[status] || '#7a9bb5'
  const bg = STATUS_BG[status] || 'rgba(122,155,181,0.1)'

  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      style={{ color, background: bg, borderColor: `${color}30` }}
    >
      {(status === 'RUNNING') && <span className={styles.pulse} style={{ background: color }} />}
      {STATUS_LABELS[status] || status}
    </span>
  )
}
