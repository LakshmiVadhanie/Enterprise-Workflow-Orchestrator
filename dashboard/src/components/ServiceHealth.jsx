import styles from './ServiceHealth.module.css'

const SERVICES = [
  { key: 'workflowService', label: 'Workflow Service', tech: 'Java / Spring Boot', port: '8080' },
  { key: 'authService',     label: 'Auth Service',     tech: 'Python / Django',    port: '8001' },
  { key: 'gateway',         label: 'GraphQL Gateway',  tech: 'Node.js / Apollo',   port: '4001' },
  { key: 'bff',             label: 'BFF Server',       tech: 'Express.js',         port: '4000' },
]

export default function ServiceHealth({ health }) {
  return (
    <div className={styles.container}>
      <div className={styles.title}>Service Health</div>
      <div className={styles.grid}>
        {SERVICES.map(svc => {
          const data = health?.[svc.key]
          const up = !health || data?.status === 'UP'
          return (
            <div key={svc.key} className={`${styles.service} ${up ? styles.up : styles.down}`}>
              <div className={styles.indicator}>
                <span className={styles.dot} />
                <span className={styles.status}>{up ? 'UP' : 'DOWN'}</span>
              </div>
              <div className={styles.label}>{svc.label}</div>
              <div className={styles.tech}>{svc.tech}</div>
              <div className={styles.port}>:{svc.port}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
