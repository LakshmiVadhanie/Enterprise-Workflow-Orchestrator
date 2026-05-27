import { Routes, Route } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import NotificationPanel from './components/NotificationPanel'
import Dashboard from './pages/Dashboard'
import WorkflowsPage from './pages/WorkflowsPage'
import WorkflowDetail from './pages/WorkflowDetail'
import UsersPage from './pages/UsersPage'
import AuditPage from './pages/AuditPage'
import { useStore } from './store'
import styles from './styles/App.module.css'

export default function App() {
  useWebSocket()
  const sidebarOpen = useStore(s => s.sidebarOpen)

  return (
    <div className={`${styles.layout} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Routes>
        </main>
      </div>
      <NotificationPanel />
    </div>
  )
}
