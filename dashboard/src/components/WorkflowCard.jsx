import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from './StatusBadge'
import { TYPE_ICONS, PRIORITY_COLORS } from '../utils/api'
import styles from './WorkflowCard.module.css'

export default function WorkflowCard({ workflow }) {
  const navigate = useNavigate()
  const progress = workflow.progressPercent ?? 0
  const icon = TYPE_ICONS[workflow.type] || '◈'
  const priorityColor = PRIORITY_COLORS[workflow.priority] || '#3d5570'

  return (
    <div className={styles.card} onClick={() => navigate(`/workflows/${workflow.id}`)}>
      {/* Priority stripe */}
      <div className={styles.priorityStripe} style={{ background: priorityColor }} />

      <div className={styles.header}>
        <div className={styles.typeIcon}>{icon}</div>
        <div className={styles.meta}>
          <div className={styles.name}>{workflow.name}</div>
          <div className={styles.owner}>
            <span className={styles.ownerEmail}>{workflow.ownerEmail || workflow.ownerId}</span>
            <span className={styles.dot}>·</span>
            <span className={styles.time}>
              {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <StatusBadge status={workflow.status} size="sm" />
      </div>

      {/* Progress bar */}
      <div className={styles.progressRow}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progress}%`,
              background: workflow.status === 'FAILED'
                ? 'var(--accent-red)'
                : workflow.status === 'COMPLETED'
                ? 'var(--accent-green)'
                : 'var(--accent-cyan)',
            }}
          />
        </div>
        <span className={styles.progressLabel}>
          {workflow.currentStep}/{workflow.totalSteps}
        </span>
      </div>

      <div className={styles.footer}>
        <span className={styles.typeTag}>{workflow.type}</span>
        {workflow.priority && (
          <span className={styles.priorityTag} style={{ color: priorityColor }}>
            {workflow.priority}
          </span>
        )}
        <span className={styles.id}>#{workflow.id?.slice(0, 8)}</span>
      </div>
    </div>
  )
}
