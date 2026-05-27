import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { fetchStats, fetchWorkflows, gql, STATUS_COLORS } from '../utils/api'
import StatCard from '../components/StatCard'
import LiveFeed from '../components/LiveFeed'
import ServiceHealth from '../components/ServiceHealth'
import WorkflowCard from '../components/WorkflowCard'
import { useStore } from '../store'
import styles from './Dashboard.module.css'

// Live throughput fetcher — queries GraphQL workflowThroughput
const fetchThroughput = (hours) => gql(`
  query GetThroughput($hours: Int) {
    workflowThroughput(hours: $hours) { time running completed failed }
  }
`, { hours })

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTime}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={styles.tooltipRow} style={{ color: p.color }}>
          <span>{p.dataKey}</span>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [throughputHours, setThroughputHours] = useState(24)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 15000,
  })

  const { data: workflowsData } = useQuery({
    queryKey: ['recent-workflows'],
    queryFn: () => fetchWorkflows({ size: 6 }),
    refetchInterval: 20000,
  })

  const { data: throughputData, isLoading: throughputLoading } = useQuery({
    queryKey: ['throughput', throughputHours],
    queryFn: () => fetchThroughput(throughputHours),
    refetchInterval: 60000,
  })

  const stats = statsData?.dashboardStats
  const health = statsData?.serviceHealth
  const workflows = workflowsData?.workflows?.content || []
  const throughput = throughputData?.workflowThroughput || []

  // Build pie data from type breakdown
  const typeData = stats?.byType
    ? Object.entries(stats.byType).map(([name, value]) => ({ name, value: Number(value) }))
    : [
        { name: 'APPROVAL', value: 12 },
        { name: 'DATA_PIPELINE', value: 8 },
        { name: 'DEPLOYMENT', value: 6 },
        { name: 'ONBOARDING', value: 4 },
        { name: 'COMPLIANCE', value: 3 },
        { name: 'INTEGRATION', value: 5 },
      ]

  const PIE_COLORS = ['#00d4ff','#10b981','#8b5cf6','#f59e0b','#f97316','#ef4444']

  return (
    <div className={styles.page}>
      {/* Page Title */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mission Control</h1>
          <p className={styles.pageSubtitle}>
            Real-time orchestration across all enterprise workflow systems
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.archTag}>
            <span>GraphQL</span><span className={styles.sep}>+</span>
            <span>WebSocket</span><span className={styles.sep}>+</span>
            <span>6 services</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className={styles.statGrid}>
        <StatCard
          label="Total Workflows"
          value={statsLoading ? '…' : (stats?.total ?? 38)}
          sub="All time"
          color="var(--accent-cyan)"
          icon="⬡"
        />
        <StatCard
          label="Running"
          value={statsLoading ? '…' : (stats?.running ?? 14)}
          sub="Active right now"
          color="var(--accent-cyan)"
          icon="▶"
        />
        <StatCard
          label="Awaiting Approval"
          value={statsLoading ? '…' : (stats?.waitingApproval ?? 3)}
          sub="Requires action"
          color="var(--accent-purple)"
          icon="⊛"
        />
        <StatCard
          label="Completed"
          value={statsLoading ? '…' : (stats?.completed ?? 18)}
          sub="Successfully finished"
          color="var(--accent-green)"
          icon="✓"
        />
        <StatCard
          label="Failed"
          value={statsLoading ? '…' : (stats?.failed ?? 2)}
          sub="Need attention"
          color="var(--accent-red)"
          icon="⚠"
        />
        <StatCard
          label="Overdue"
          value={statsLoading ? '…' : (stats?.overdue ?? 1)}
          sub="Past due date"
          color="var(--accent-amber)"
          icon="⏰"
        />
      </div>

      {/* Main grid */}
      <div className={styles.mainGrid}>
        {/* Throughput chart */}
        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Workflow Throughput</span>
            <div className={styles.timeToggle}>
              {[{label:'24h',val:24},{label:'48h',val:48},{label:'7d',val:168}].map(opt => (
                <button
                  key={opt.val}
                  className={`${styles.toggleBtn} ${throughputHours === opt.val ? styles.toggleActive : ''}`}
                  onClick={() => setThroughputHours(opt.val)}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.chartWrap}>
            {throughputLoading ? (
              <div className={styles.chartSkeleton} />
            ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={throughput} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRunning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,61,0.8)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#3d5570', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3d5570', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="running"   stroke="#00d4ff" strokeWidth={2} fill="url(#gradRunning)"   dot={false} />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#gradCompleted)" dot={false} />
                <Area type="monotone" dataKey="failed"    stroke="#ef4444" strokeWidth={1.5} fill="url(#gradFailed)"    dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
          <div className={styles.chartLegend}>
            {[
              { color: '#00d4ff', label: 'Running' },
              { color: '#10b981', label: 'Completed' },
              { color: '#ef4444', label: 'Failed' },
            ].map(l => (
              <span key={l.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Type breakdown pie */}
        <div className={`${styles.panel} ${styles.piePanel}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>By Type</span>
            <span className={styles.panelSub}>Distribution</span>
          </div>
          <div className={styles.pieWrap}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', fontFamily: 'Space Mono' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.pieLabels}>
            {typeData.map((d, i) => (
              <div key={d.name} className={styles.pieLabel}>
                <span className={styles.pieDot} style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className={styles.pieName}>{d.name.replace('_', ' ')}</span>
                <span className={styles.pieValue}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live feed */}
        <div className={`${styles.panel} ${styles.feedPanel}`}>
          <LiveFeed />
        </div>

        {/* Service health */}
        <div className={`${styles.panel} ${styles.healthPanel}`}>
          <ServiceHealth health={health} />
        </div>
      </div>

      {/* Recent workflows */}
      <div className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Workflows</h2>
          <a href="/workflows" className={styles.viewAll}>View all →</a>
        </div>
        <div className={styles.workflowGrid}>
          {(workflows.length > 0 ? workflows : DEMO_WORKFLOWS).map(wf => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Demo data shown when backend is not connected
const DEMO_WORKFLOWS = [
  { id: 'aabb1100-0000-0000-0000-000000000001', name: 'Q4 Budget Approval', status: 'WAITING_APPROVAL', type: 'APPROVAL', priority: 'CRITICAL', ownerId: 'u1', ownerEmail: 'cfo@acme.com', currentStep: 2, totalSteps: 5, progressPercent: 40, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000002', name: 'Prod Deployment v3.2', status: 'RUNNING', type: 'DEPLOYMENT', priority: 'HIGH', ownerId: 'u2', ownerEmail: 'devops@acme.com', currentStep: 3, totalSteps: 8, progressPercent: 37, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000003', name: 'ETL Pipeline: CRM Sync', status: 'COMPLETED', type: 'DATA_PIPELINE', priority: 'MEDIUM', ownerId: 'u3', ownerEmail: 'data@acme.com', currentStep: 6, totalSteps: 6, progressPercent: 100, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000004', name: 'New Hire Onboarding: Sarah', status: 'RUNNING', type: 'ONBOARDING', priority: 'MEDIUM', ownerId: 'u4', ownerEmail: 'hr@acme.com', currentStep: 1, totalSteps: 10, progressPercent: 10, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000005', name: 'SOC2 Compliance Audit', status: 'FAILED', type: 'COMPLIANCE', priority: 'CRITICAL', ownerId: 'u5', ownerEmail: 'sec@acme.com', currentStep: 4, totalSteps: 12, progressPercent: 33, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'aabb1100-0000-0000-0000-000000000006', name: 'Salesforce Integration', status: 'PENDING', type: 'INTEGRATION', priority: 'LOW', ownerId: 'u6', ownerEmail: 'eng@acme.com', currentStep: 0, totalSteps: 5, progressPercent: 0, createdAt: new Date(Date.now() - 300000).toISOString() },
]
