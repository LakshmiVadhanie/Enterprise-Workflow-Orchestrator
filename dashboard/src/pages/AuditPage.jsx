import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchAuditLogs } from '../utils/api'
import styles from './AuditPage.module.css'

const ACTION_COLORS = {
  LOGIN: '#00d4ff', LOGOUT: '#7a9bb5', CREATE: '#10b981',
  UPDATE: '#f59e0b', DELETE: '#ef4444', APPROVE: '#8b5cf6',
}

const DEMO_LOGS = [
  { id: '1', userEmail: 'devops@acme.com', action: 'CREATE', resourceType: 'WORKFLOW', resourceId: 'wf-002', payload: { name: 'Prod Deployment v3.2' }, createdAt: new Date(Date.now()-1800000).toISOString() },
  { id: '2', userEmail: 'cfo@acme.com',    action: 'APPROVE', resourceType: 'STEP',    resourceId: 'step-4', payload: { comment: 'Looks good, approved' },  createdAt: new Date(Date.now()-3600000).toISOString() },
  { id: '3', userEmail: 'sec@acme.com',    action: 'LOGIN',  resourceType: 'AUTH',    resourceId: '',       payload: { method: 'email_password' },           createdAt: new Date(Date.now()-5400000).toISOString() },
  { id: '4', userEmail: 'hr@acme.com',     action: 'CREATE', resourceType: 'WORKFLOW', resourceId: 'wf-004', payload: { name: 'New Hire Onboarding' },       createdAt: new Date(Date.now()-7200000).toISOString() },
  { id: '5', userEmail: 'legal@acme.com',  action: 'UPDATE', resourceType: 'WORKFLOW', resourceId: 'wf-007', payload: { field: 'dueDate' },                  createdAt: new Date(Date.now()-9000000).toISOString() },
  { id: '6', userEmail: 'system',          action: 'CREATE', resourceType: 'WORKFLOW', resourceId: 'wf-008', payload: { name: 'AWS Cost Optimization' },     createdAt: new Date(Date.now()-10800000).toISOString() },
  { id: '7', userEmail: 'data@acme.com',   action: 'LOGIN',  resourceType: 'AUTH',    resourceId: '',       payload: { method: 'email_password' },           createdAt: new Date(Date.now()-12600000).toISOString() },
  { id: '8', userEmail: 'cfo@acme.com',    action: 'APPROVE', resourceType: 'WORKFLOW', resourceId: 'wf-001', payload: { comment: 'Budget approved' },       createdAt: new Date(Date.now()-14400000).toISOString() },
]

export default function AuditPage() {
  const { data } = useQuery({ queryKey: ['audit-logs'], queryFn: fetchAuditLogs })
  const logs = data?.auditLogs || DEMO_LOGS

  const actionSummary = logs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1
    return acc
  }, {})

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Audit Log</h1>
          <p className={styles.sub}>Full event trail — every action, every actor, every timestamp</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className={styles.summary}>
        {Object.entries(actionSummary).map(([action, count]) => (
          <div key={action} className={styles.summaryChip} style={{ '--ac': ACTION_COLORS[action] || '#7a9bb5' }}>
            <span className={styles.summaryCount}>{count}</span>
            <span className={styles.summaryAction}>{action}</span>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>ID</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className={styles.row}>
                <td>
                  <span className={styles.ts}>
                    {format(new Date(log.createdAt), 'MMM dd HH:mm:ss')}
                  </span>
                </td>
                <td>
                  <span className={styles.actor}>{log.userEmail || 'system'}</span>
                </td>
                <td>
                  <span
                    className={styles.action}
                    style={{ color: ACTION_COLORS[log.action] || '#7a9bb5', borderColor: `${ACTION_COLORS[log.action] || '#7a9bb5'}30`, background: `${ACTION_COLORS[log.action] || '#7a9bb5'}10` }}
                  >{log.action}</span>
                </td>
                <td>
                  <span className={styles.resource}>{log.resourceType}</span>
                </td>
                <td>
                  <span className={styles.resId}>{log.resourceId ? `#${log.resourceId.slice(0, 8)}` : '—'}</span>
                </td>
                <td>
                  <span className={styles.payload}>
                    {log.payload ? JSON.stringify(log.payload).slice(0, 60) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
