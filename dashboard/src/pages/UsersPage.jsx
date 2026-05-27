import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../utils/api'
import styles from './UsersPage.module.css'

const ROLE_COLORS = {
  ADMIN: '#ef4444', MANAGER: '#f59e0b', ANALYST: '#00d4ff',
  VIEWER: '#7a9bb5', APPROVER: '#8b5cf6', DEVELOPER: '#10b981',
}

const DEMO_USERS = [
  { id: 'u1', email: 'cfo@acme.com',      username: 'jsmith',   fullName: 'Jane Smith',    department: 'Finance',     jobTitle: 'CFO',           roles: ['ADMIN', 'APPROVER'],  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 'u2', email: 'devops@acme.com',   username: 'mbrown',   fullName: 'Mike Brown',    department: 'Engineering', jobTitle: 'DevOps Lead',    roles: ['MANAGER', 'DEVELOPER'], isActive: true, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'u3', email: 'data@acme.com',     username: 'awilson',  fullName: 'Amy Wilson',    department: 'Data',        jobTitle: 'Data Engineer',  roles: ['ANALYST'],            isActive: true, createdAt: '2024-02-14T00:00:00Z' },
  { id: 'u4', email: 'hr@acme.com',       username: 'rjohnson', fullName: 'Robert Johnson', department: 'HR',         jobTitle: 'HR Manager',     roles: ['MANAGER'],            isActive: true, createdAt: '2024-01-20T00:00:00Z' },
  { id: 'u5', email: 'sec@acme.com',      username: 'ldavis',   fullName: 'Lisa Davis',    department: 'Security',    jobTitle: 'CISO',           roles: ['ADMIN', 'APPROVER'],  isActive: true, createdAt: '2024-01-10T00:00:00Z' },
  { id: 'u6', email: 'eng@acme.com',      username: 'clee',     fullName: 'Chris Lee',     department: 'Engineering', jobTitle: 'Engineer',       roles: ['DEVELOPER'],          isActive: true, createdAt: '2024-03-01T00:00:00Z' },
  { id: 'u7', email: 'legal@acme.com',    username: 'kmartin',  fullName: 'Kate Martin',   department: 'Legal',       jobTitle: 'General Counsel', roles: ['APPROVER', 'VIEWER'], isActive: true, createdAt: '2024-02-28T00:00:00Z' },
  { id: 'u8', email: 'analyst@acme.com',  username: 'tclark',   fullName: 'Tom Clark',     department: 'Finance',     jobTitle: 'Analyst',        roles: ['ANALYST', 'VIEWER'],  isActive: false, createdAt: '2024-01-25T00:00:00Z' },
]

export default function UsersPage() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const users = data?.users?.results || DEMO_USERS

  const deptCounts = users.reduce((acc, u) => {
    acc[u.department] = (acc[u.department] || 0) + 1
    return acc
  }, {})

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Users & Permissions</h1>
          <p className={styles.sub}>{users.length} users · RBAC via Django Auth Service</p>
        </div>
      </div>

      {/* Role summary */}
      <div className={styles.roleSummary}>
        {Object.entries(ROLE_COLORS).map(([role, color]) => {
          const count = users.filter(u => u.roles?.includes(role)).length
          return (
            <div key={role} className={styles.roleCard} style={{ '--rc': color }}>
              <div className={styles.roleCount}>{count}</div>
              <div className={styles.roleName}>{role}</div>
            </div>
          )
        })}
      </div>

      {/* Users grid */}
      <div className={styles.grid}>
        {users.map(user => (
          <div key={user.id} className={`${styles.card} ${!user.isActive ? styles.inactive : ''}`}>
            <div className={styles.avatar}>
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{user.fullName || user.username}</div>
              <div className={styles.email}>{user.email}</div>
              <div className={styles.dept}>{user.jobTitle} · {user.department}</div>
            </div>
            <div className={styles.roles}>
              {(user.roles || []).map(role => (
                <span
                  key={role}
                  className={styles.roleTag}
                  style={{ color: ROLE_COLORS[role], borderColor: `${ROLE_COLORS[role]}30`, background: `${ROLE_COLORS[role]}10` }}
                >{role}</span>
              ))}
            </div>
            {!user.isActive && <div className={styles.inactiveBadge}>INACTIVE</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
