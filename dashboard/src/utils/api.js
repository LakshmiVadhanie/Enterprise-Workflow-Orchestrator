import axios from 'axios'

const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:4000'
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4001/graphql'

export const api = axios.create({
  baseURL: BFF_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export const gql = async (query, variables = {}) => {
  const { data } = await api.post('/api/graphql', { query, variables })
  if (data.errors) throw new Error(data.errors[0].message)
  return data.data
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export const fetchWorkflows = async ({ status, type, page = 0, size = 20 } = {}) => {
  const params = new URLSearchParams({ page, size })
  if (status) params.set('status', status)
  if (type) params.set('type', type)
  const { data } = await api.get(`/api/graphql`, {
    method: 'post',
  })
  // Use GraphQL
  return gql(`
    query GetWorkflows($status: WorkflowStatus, $type: WorkflowType, $page: Int, $size: Int) {
      workflows(status: $status, type: $type, page: $page, size: $size) {
        content {
          id name status type priority ownerId ownerEmail
          currentStep totalSteps progressPercent
          createdAt updatedAt startedAt completedAt dueDate
          errorMessage
        }
        totalElements totalPages number size
      }
    }
  `, { status, type, page, size })
}

export const fetchStats = async () => {
  return gql(`
    query {
      dashboardStats {
        total running pending completed failed waitingApproval overdue recentCount byType
      }
      serviceHealth {
        workflowService { status service }
        authService { status service }
        gateway { status service }
      }
    }
  `)
}

export const fetchWorkflow = async (id) => {
  return gql(`
    query GetWorkflow($id: ID!) {
      workflow(id: $id) {
        id name status type priority description ownerId ownerEmail
        currentStep totalSteps progressPercent
        createdAt updatedAt startedAt completedAt dueDate errorMessage
        steps {
          id stepOrder name description status type
          assigneeId assigneeEmail retryCount maxRetries
          startedAt completedAt
        }
        events {
          id eventType fromStatus toStatus actorEmail message createdAt
        }
      }
    }
  `, { id })
}

export const createWorkflow = async (input) => {
  return gql(`
    mutation CreateWorkflow($input: CreateWorkflowInput!) {
      createWorkflow(input: $input) {
        id name status type priority createdAt
      }
    }
  `, { input })
}

export const startWorkflow = async (id) => {
  return gql(`mutation { startWorkflow(id: "${id}") { id status currentStep } }`)
}

export const cancelWorkflow = async (id, reason) => {
  return gql(`mutation { cancelWorkflow(id: "${id}", reason: "${reason}") { id status } }`)
}

export const retryWorkflow = async (id) => {
  return gql(`mutation { retryWorkflow(id: "${id}") { id status } }`)
}

export const fetchUsers = async () => {
  return gql(`
    query {
      users {
        results {
          id email username fullName department jobTitle roles isActive createdAt
        }
        count
      }
    }
  `)
}

export const fetchAuditLogs = async () => {
  return gql(`
    query {
      auditLogs {
        id userEmail action resourceType resourceId payload createdAt
      }
    }
  `)
}

// Status color map
export const STATUS_COLORS = {
  RUNNING: '#00d4ff',
  COMPLETED: '#10b981',
  FAILED: '#ef4444',
  PENDING: '#f59e0b',
  PAUSED: '#7a9bb5',
  CANCELLED: '#3d5570',
  WAITING_APPROVAL: '#8b5cf6',
  DRAFT: '#3d5570',
}

export const STATUS_BG = {
  RUNNING: 'rgba(0,212,255,0.1)',
  COMPLETED: 'rgba(16,185,129,0.1)',
  FAILED: 'rgba(239,68,68,0.1)',
  PENDING: 'rgba(245,158,11,0.1)',
  PAUSED: 'rgba(122,155,181,0.1)',
  CANCELLED: 'rgba(61,85,112,0.1)',
  WAITING_APPROVAL: 'rgba(139,92,246,0.1)',
  DRAFT: 'rgba(61,85,112,0.1)',
}

export const TYPE_ICONS = {
  APPROVAL: '✓',
  DATA_PIPELINE: '⇄',
  DEPLOYMENT: '↑',
  ONBOARDING: '→',
  COMPLIANCE: '⊕',
  INTEGRATION: '⊞',
  CUSTOM: '◈',
}

export const PRIORITY_COLORS = {
  LOW: '#3d5570',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
}
