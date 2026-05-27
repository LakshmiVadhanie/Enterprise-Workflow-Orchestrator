import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { fetchWorkflow, startWorkflow, cancelWorkflow, retryWorkflow, STATUS_COLORS, TYPE_ICONS, PRIORITY_COLORS } from '../utils/api'
import StatusBadge from '../components/StatusBadge'
import styles from './WorkflowDetail.module.css'

const STEP_TYPE_COLORS = {
  HUMAN_APPROVAL: '#8b5cf6',
  AUTOMATED_TASK: '#00d4ff',
  NOTIFICATION:   '#f59e0b',
  CONDITION:      '#10b981',
  PARALLEL:       '#f97316',
  WEBHOOK:        '#ec4899',
  SCRIPT:         '#6366f1',
}

export default function WorkflowDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => fetchWorkflow(id),
    refetchInterval: 10000,
    enabled: !!id && !id.startsWith('aabb'),
  })

  const wf = data?.workflow || DEMO_DETAIL
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workflow', id] })

  const startMut  = useMutation({ mutationFn: startWorkflow,  onSuccess: invalidate })
  const cancelMut = useMutation({ mutationFn: (i) => cancelWorkflow(i, 'Cancelled'), onSuccess: invalidate })
  const retryMut  = useMutation({ mutationFn: retryWorkflow,  onSuccess: invalidate })

  if (isLoading) {
    return <div className={styles.loading}>Loading workflow…</div>
  }

  const progress = wf.progressPercent ?? Math.round(((wf.currentStep || 0) / (wf.totalSteps || 1)) * 100)

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.back} onClick={() => navigate('/workflows')}>
        ← Back to Workflows
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.typeIcon}>{TYPE_ICONS[wf.type] || '◈'}</div>
          <div>
            <h1 className={styles.name}>{wf.name}</h1>
            <div className={styles.meta}>
              <span className={styles.metaId}>#{wf.id?.slice(0, 16)}</span>
              <span className={styles.metaSep}>·</span>
              <span className={styles.metaType}>{wf.type?.replace('_', ' ')}</span>
              {wf.priority && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaPriority} style={{ color: PRIORITY_COLORS[wf.priority] }}>
                    {wf.priority}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <StatusBadge status={wf.status} size="lg" />
          <div className={styles.actionButtons}>
            {wf.status === 'PENDING' && (
              <button className={`${styles.btn} ${styles.btnStart}`} onClick={() => startMut.mutate(wf.id)}>
                ▶ Start
              </button>
            )}
            {wf.status === 'FAILED' && (
              <button className={`${styles.btn} ${styles.btnRetry}`} onClick={() => retryMut.mutate(wf.id)}>
                ↺ Retry
              </button>
            )}
            {['RUNNING', 'PENDING', 'PAUSED'].includes(wf.status) && (
              <button className={`${styles.btn} ${styles.btnCancel}`} onClick={() => cancelMut.mutate(wf.id)}>
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Overall Progress</span>
          <span className={styles.progressPct}>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progress}%`,
              background: wf.status === 'FAILED' ? 'var(--accent-red)'
                : wf.status === 'COMPLETED' ? 'var(--accent-green)'
                : wf.status === 'WAITING_APPROVAL' ? 'var(--accent-purple)'
                : 'linear-gradient(90deg, var(--accent-cyan), rgba(0,212,255,0.6))',
            }}
          />
        </div>
        <div className={styles.progressSub}>
          Step {wf.currentStep ?? 0} of {wf.totalSteps ?? 0}
        </div>
      </div>

      {/* Info cards */}
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Owner</span>
          <span className={styles.infoValue}>{wf.ownerEmail || wf.ownerId}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Created</span>
          <span className={styles.infoValue}>
            {wf.createdAt ? format(new Date(wf.createdAt), 'MMM dd, yyyy HH:mm') : '—'}
          </span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Started</span>
          <span className={styles.infoValue}>
            {wf.startedAt ? format(new Date(wf.startedAt), 'MMM dd, yyyy HH:mm') : '—'}
          </span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Completed</span>
          <span className={styles.infoValue}>
            {wf.completedAt ? format(new Date(wf.completedAt), 'MMM dd, yyyy HH:mm') : '—'}
          </span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Due Date</span>
          <span className={styles.infoValue}>
            {wf.dueDate ? format(new Date(wf.dueDate), 'MMM dd, yyyy') : '—'}
          </span>
        </div>
        {wf.description && (
          <div className={`${styles.infoCard} ${styles.infoCardWide}`}>
            <span className={styles.infoLabel}>Description</span>
            <span className={styles.infoValue}>{wf.description}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {wf.errorMessage && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠</span>
          <div>
            <div className={styles.errorTitle}>Error</div>
            <div className={styles.errorMsg}>{wf.errorMessage}</div>
          </div>
        </div>
      )}

      {/* Two column: steps + events */}
      <div className={styles.detailGrid}>
        {/* Steps timeline */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Step Pipeline</div>
          <div className={styles.timeline}>
            {(wf.steps || []).sort((a, b) => a.stepOrder - b.stepOrder).map((step, i) => {
              const isActive  = step.status === 'RUNNING'
              const isDone    = step.status === 'COMPLETED'
              const isFailed  = step.status === 'FAILED'
              const isPending = step.status === 'PENDING'
              const typeColor = STEP_TYPE_COLORS[step.type] || '#7a9bb5'

              return (
                <div key={step.id} className={`${styles.step} ${styles[`step${step.status}`]}`}>
                  {/* Connector line */}
                  {i < (wf.steps?.length - 1) && (
                    <div className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`} />
                  )}

                  <div className={`${styles.stepDot} ${isActive ? styles.stepDotActive : isDone ? styles.stepDotDone : isFailed ? styles.stepDotFailed : ''}`}>
                    {isDone ? '✓' : isFailed ? '✕' : isActive ? '▶' : step.stepOrder}
                  </div>

                  <div className={styles.stepBody}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepName}>{step.name}</span>
                      <span className={styles.stepType} style={{ color: typeColor, borderColor: `${typeColor}30`, background: `${typeColor}10` }}>
                        {step.type.replace('_', ' ')}
                      </span>
                      <span className={`${styles.stepStatus} ${styles[`ss${step.status}`]}`}>{step.status}</span>
                    </div>

                    {step.description && (
                      <div className={styles.stepDesc}>{step.description}</div>
                    )}

                    <div className={styles.stepMeta}>
                      {step.assigneeEmail && (
                        <span className={styles.stepAssignee}>→ {step.assigneeEmail}</span>
                      )}
                      {step.startedAt && (
                        <span className={styles.stepTime}>
                          Started {formatDistanceToNow(new Date(step.startedAt), { addSuffix: true })}
                        </span>
                      )}
                      {step.retryCount > 0 && (
                        <span className={styles.stepRetry}>↺ {step.retryCount}/{step.maxRetries} retries</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Audit events */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Event History</div>
          <div className={styles.events}>
            {(wf.events || []).map((evt, i) => (
              <div key={evt.id || i} className={styles.event}>
                <div className={styles.eventDot} style={{ background: evt.toStatus ? STATUS_COLORS[evt.toStatus] : 'var(--text-dim)' }} />
                <div className={styles.eventBody}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventType}>{evt.eventType}</span>
                    {evt.toStatus && (
                      <span className={styles.eventTransition} style={{ color: STATUS_COLORS[evt.toStatus] }}>
                        {evt.fromStatus && `${evt.fromStatus} → `}{evt.toStatus}
                      </span>
                    )}
                  </div>
                  {evt.message && <div className={styles.eventMsg}>{evt.message}</div>}
                  <div className={styles.eventFoot}>
                    {evt.actorEmail && <span className={styles.eventActor}>{evt.actorEmail}</span>}
                    <span className={styles.eventTime}>
                      {evt.createdAt
                        ? formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })
                        : 'just now'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(!wf.events || wf.events.length === 0) && (
              <div className={styles.noEvents}>No events recorded yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const DEMO_DETAIL = {
  id: 'aabb1100-0000-0000-0000-000000000002',
  name: 'Prod Deployment v3.2',
  description: 'Full production deployment of microservices v3.2 including zero-downtime rolling update.',
  status: 'RUNNING',
  type: 'DEPLOYMENT',
  priority: 'HIGH',
  ownerEmail: 'devops@acme.com',
  currentStep: 3,
  totalSteps: 8,
  progressPercent: 37,
  createdAt: new Date(Date.now() - 1800000).toISOString(),
  startedAt: new Date(Date.now() - 1700000).toISOString(),
  steps: [
    { id: 's1', stepOrder: 1, name: 'Pre-flight Checks',    type: 'AUTOMATED_TASK',  status: 'COMPLETED', description: 'Validate environment and configs', startedAt: new Date(Date.now()-1700000).toISOString(), completedAt: new Date(Date.now()-1650000).toISOString(), retryCount: 0, maxRetries: 3 },
    { id: 's2', stepOrder: 2, name: 'Build & Push Image',   type: 'AUTOMATED_TASK',  status: 'COMPLETED', description: 'Docker build and push to GCR', startedAt: new Date(Date.now()-1640000).toISOString(), completedAt: new Date(Date.now()-1500000).toISOString(), retryCount: 0, maxRetries: 3 },
    { id: 's3', stepOrder: 3, name: 'Canary Deploy',        type: 'AUTOMATED_TASK',  status: 'RUNNING',   description: 'Deploy to 10% of pods via Helm', startedAt: new Date(Date.now()-1490000).toISOString(), retryCount: 0, maxRetries: 3 },
    { id: 's4', stepOrder: 4, name: 'Traffic Split Approval', type: 'HUMAN_APPROVAL', status: 'PENDING',   description: 'Approve traffic shift to 50%', assigneeEmail: 'lead@acme.com', retryCount: 0, maxRetries: 1 },
    { id: 's5', stepOrder: 5, name: 'Full Rollout',         type: 'AUTOMATED_TASK',  status: 'PENDING',   description: 'Helm rolling update to all pods', retryCount: 0, maxRetries: 3 },
    { id: 's6', stepOrder: 6, name: 'Smoke Tests',          type: 'AUTOMATED_TASK',  status: 'PENDING',   description: 'Run integration smoke tests', retryCount: 0, maxRetries: 2 },
    { id: 's7', stepOrder: 7, name: 'Notify Stakeholders',  type: 'NOTIFICATION',    status: 'PENDING',   description: 'Send Slack + email notifications', retryCount: 0, maxRetries: 1 },
    { id: 's8', stepOrder: 8, name: 'Cleanup Old Pods',     type: 'AUTOMATED_TASK',  status: 'PENDING',   description: 'Remove deprecated pod versions', retryCount: 0, maxRetries: 2 },
  ],
  events: [
    { id: 'e1', eventType: 'CREATED',   toStatus: 'PENDING',  fromStatus: null,      actorEmail: 'devops@acme.com', message: 'Deployment workflow created', createdAt: new Date(Date.now()-1800000).toISOString() },
    { id: 'e2', eventType: 'STARTED',   toStatus: 'RUNNING',  fromStatus: 'PENDING', actorEmail: 'devops@acme.com', message: 'Workflow started', createdAt: new Date(Date.now()-1700000).toISOString() },
    { id: 'e3', eventType: 'STEP_DONE', toStatus: 'RUNNING',  fromStatus: 'RUNNING', actorEmail: 'system',          message: 'Pre-flight checks passed', createdAt: new Date(Date.now()-1650000).toISOString() },
    { id: 'e4', eventType: 'STEP_DONE', toStatus: 'RUNNING',  fromStatus: 'RUNNING', actorEmail: 'system',          message: 'Image built and pushed to gcr.io/acme/app:v3.2', createdAt: new Date(Date.now()-1500000).toISOString() },
  ],
}
