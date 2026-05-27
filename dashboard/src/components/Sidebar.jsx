import { NavLink, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◈', exact: true },
  { to: '/workflows', label: 'Workflows', icon: '⇄' },
  { to: '/users', label: 'Users', icon: '◎' },
  { to: '/audit', label: 'Audit Log', icon: '≡' },
]

export default function Sidebar() {
  const sidebarOpen = useStore(s => s.sidebarOpen)
  const wsConnected = useStore(s => s.wsConnected)

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>
          <span className={styles.logoIcon}>⬡</span>
        </div>
        {sidebarOpen && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>ORCHESTR</span>
            <span className={styles.logoSub}>ENTERPRISE</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.wsStatus}>
          <span className={`${styles.wsDot} ${wsConnected ? styles.wsDotOn : styles.wsDotOff}`} />
          {sidebarOpen && (
            <span className={styles.wsLabel}>
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          )}
        </div>
        {sidebarOpen && (
          <div className={styles.version}>
            <span>v1.0.0</span>
          </div>
        )}
      </div>
    </aside>
  )
}
