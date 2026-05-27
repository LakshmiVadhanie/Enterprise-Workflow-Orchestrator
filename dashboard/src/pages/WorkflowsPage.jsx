import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fetchWorkflows, startWorkflow, cancelWorkflow, retryWorkflow, STATUS_COLORS, TYPE_ICONS, PRIORITY_COLORS } from '../utils/api'
import StatusBadge from '../components/StatusBadge'
import styles from './WorkflowsPage.module.css'

const STATUSES = ['RUNNING', 'PENDING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELLED']
const TYPES    = ['APPROVAL', 'DATA_PIPELINE', 'DEPLOYMENT', 'ONBOARDING', 'COMPLIANCE', 'INTEGRATION', 'CUSTOM']

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(null)
  const [type, setType] = useState(null)
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', status, type, page],
    queryFn: () => fetchWorkflows({ status, type, page, size: 15 }),
    refetchInterval: 15000,
  })

  const workflows = data?.workflows?.content || DEMO_WORKFLOWS
  const total = data?.workflows?.totalElements ?? DEMO_WORKFLOWS.length
  const totalPages = data?.workflows?.totalPages ?? 1

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workflows'] })

  const startMut   = useMutation({ mutationFn: startWorkflow,  onSuccess: invalidate })
  const cancelMut  = useMutation({ mutationFn: (id) => cancelWorkflow(id, 'Cancelled by user'), onSuccess: invalidate })
  const retryMut   = useMutation({ mutationFn: retryWorkflow,  onSuccess: invalidate })

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Workflows</h1>
          <p className={styles.sub}>{total} total workflows across all systems</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <span>+</span> New Workflow
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>STATUS</span>
          <div className={styles.filterChips}>
            <button
              className={`${styles.chip} ${!status ? styles.chipActive : ''}`}
              onClick={() => { setStatus(null); setPage(0) }}
            >All</button>
            {STATUSES.map(s => (
              <button
                key={s}
                className={`${styles.chip} ${status === s ? styles.chipActive : ''}`}
                style={status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : {}}
                onClick={() => { setStatus(s); setPage(0) }}
              >{s.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>TYPE</span>
          <div className={styles.filterChips}>
            <button
              className={`${styles.chip} ${!type ? styles.chipActive : ''}`}
              onClick={() => { setType(null); setPage(0) }}
            >All</button>
            {TYPES.map(t => (
              <button
                key={t}
                className={`${styles.chip} ${type === t ? styles.chipActive : ''}`}
                onClick={() => { setType(t); setPage(0) }}
              >{TYPE_ICONS[t]} {t.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Type</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Progress</th>
              <th>Owner</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={styles.skeleton}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className={styles.skeletonBar} /></td>
                    ))}
                  </tr>
                ))
              : workflows.map(wf => (
                  <tr
                    key={wf.id}
                    className={styles.row}
                    onClick={() => navigate(`/workflows/${wf.id}`)}
                  >
                    <td>
                      <div className={styles.nameCell}>
                        <span className={styles.nameText}>{wf.name}</span>
                        <span className={styles.idText}>#{wf.id?.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.typeCell}>
                        {TYPE_ICONS[wf.type]} {wf.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td><StatusBadge status={wf.status} size="sm" /></td>
                    <td>
                      <span
                        className={styles.priority}
                        style={{ color: PRIORITY_COLORS[wf.priority] || 'var(--text-muted)' }}
                      >{wf.priority || '—'}</span>
                    </td>
                    <td>
                      <div className={styles.progressCell}>
                        <div className={styles.miniTrack}>
                          <div
                            className={styles.miniFill}
                            style={{
                              width: `${wf.progressPercent ?? 0}%`,
                              background: wf.status === 'FAILED' ? 'var(--accent-red)'
                                : wf.status === 'COMPLETED' ? 'var(--accent-green)'
                                : 'var(--accent-cyan)',
                            }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {wf.currentStep ?? 0}/{wf.totalSteps ?? 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.ownerCell}>{wf.ownerEmail || wf.ownerId}</span>
                    </td>
                    <td>
                      <span className={styles.timeCell}>
                        {formatDistanceToNow(new Date(wf.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className={styles.actions}>
                        {wf.status === 'PENDING' && (
                          <button
                            className={`${styles.actionBtn} ${styles.startBtn}`}
                            onClick={() => startMut.mutate(wf.id)}
                          >▶</button>
                        )}
                        {wf.status === 'FAILED' && (
                          <button
                            className={`${styles.actionBtn} ${styles.retryBtn}`}
                            onClick={() => retryMut.mutate(wf.id)}
                          >↺</button>
                        )}
                        {['RUNNING', 'PENDING', 'PAUSED'].includes(wf.status) && (
                          <button
                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                            onClick={() => cancelMut.mutate(wf.id)}
                          >✕</button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => navigate(`/workflows/${wf.id}`)}
                        >→</button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          Showing {Math.min(page * 15 + 1, total)}–{Math.min((page + 1) * 15, total)} of {total}
        </span>
        <div className={styles.pageButtons}>
          <button
            className={styles.pageBtn}
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >← Prev</button>
          <span className={styles.pageNum}>{page + 1} / {Math.max(1, totalPages)}</span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >Next →</button>
        </div>
      </div>

      {/* Create modal placeholder */}
      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create Workflow</h2>
              <button onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalNote}>
                Use the GraphQL Playground at <code>localhost:4001/graphql</code> or POST to
                <code> /api/workflows</code> on the workflow service to create workflows programmatically.
              </p>
              <pre className={styles.modalCode}>{`mutation {
  createWorkflow(input: {
    name: "My Workflow"
    type: APPROVAL
    ownerId: "user-id"
    priority: HIGH
    steps: [
      { stepOrder: 1, name: "Review", type: HUMAN_APPROVAL }
      { stepOrder: 2, name: "Execute", type: AUTOMATED_TASK }
    ]
  }) { id status }
}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEMO_WORKFLOWS = [
  { id: 'aabb1100-0000-0000-0000-000000000001', name: 'Q4 Budget Approval', status: 'WAITING_APPROVAL', type: 'APPROVAL', priority: 'CRITICAL', ownerEmail: 'cfo@acme.com', currentStep: 2, totalSteps: 5, progressPercent: 40, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000002', name: 'Prod Deployment v3.2', status: 'RUNNING',         type: 'DEPLOYMENT', priority: 'HIGH', ownerEmail: 'devops@acme.com', currentStep: 3, totalSteps: 8, progressPercent: 37, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000003', name: 'ETL Pipeline: CRM Sync', status: 'COMPLETED',    type: 'DATA_PIPELINE', priority: 'MEDIUM', ownerEmail: 'data@acme.com', currentStep: 6, totalSteps: 6, progressPercent: 100, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000004', name: 'New Hire Onboarding: Sarah', status: 'RUNNING',  type: 'ONBOARDING', priority: 'MEDIUM', ownerEmail: 'hr@acme.com', currentStep: 1, totalSteps: 10, progressPercent: 10, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000005', name: 'SOC2 Compliance Audit', status: 'FAILED',        type: 'COMPLIANCE', priority: 'CRITICAL', ownerEmail: 'sec@acme.com', currentStep: 4, totalSteps: 12, progressPercent: 33, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000006', name: 'Salesforce Integration', status: 'PENDING',      type: 'INTEGRATION', priority: 'LOW', ownerEmail: 'eng@acme.com', currentStep: 0, totalSteps: 5, progressPercent: 0, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000007', name: 'GDPR Data Purge', status: 'PAUSED',              type: 'COMPLIANCE', priority: 'HIGH', ownerEmail: 'legal@acme.com', currentStep: 2, totalSteps: 7, progressPercent: 28, createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000008', name: 'AWS Cost Optimization', status: 'PENDING',       type: 'CUSTOM', priority: 'LOW', ownerEmail: 'cloud@acme.com', currentStep: 0, totalSteps: 4, progressPercent: 0, createdAt: new Date(Date.now() - 500000).toISOString() },
]
