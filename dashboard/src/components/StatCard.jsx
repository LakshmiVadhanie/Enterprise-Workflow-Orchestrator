import styles from './StatCard.module.css'

export default function StatCard({ label, value, sub, color = 'var(--accent-cyan)', icon, trend }) {
  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <div className={styles.value}>{value ?? '—'}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
      {trend !== undefined && (
        <div className={`${styles.trend} ${trend >= 0 ? styles.up : styles.down}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
      <div className={styles.bar} />
    </div>
  )
}
