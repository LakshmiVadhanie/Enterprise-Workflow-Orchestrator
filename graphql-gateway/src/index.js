import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import DataLoader from 'dataloader';
import { gql } from 'graphql-tag';
import 'dotenv/config';

const WORKFLOW_URL = process.env.WORKFLOW_SERVICE_URL || 'http://localhost:8080';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
const PORT = process.env.PORT || 4001;

// ─── Type Definitions ────────────────────────────────────────────────────────

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum WorkflowStatus {
    DRAFT
    PENDING
    RUNNING
    PAUSED
    COMPLETED
    FAILED
    CANCELLED
    WAITING_APPROVAL
  }

  enum WorkflowType {
    APPROVAL
    DATA_PIPELINE
    DEPLOYMENT
    ONBOARDING
    COMPLIANCE
    INTEGRATION
    CUSTOM
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum StepStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    SKIPPED
    WAITING
  }

  enum StepType {
    HUMAN_APPROVAL
    AUTOMATED_TASK
    NOTIFICATION
    CONDITION
    PARALLEL
    WEBHOOK
    SCRIPT
  }

  type WorkflowStep {
    id: ID!
    stepOrder: Int!
    name: String!
    description: String
    status: StepStatus!
    type: StepType!
    assigneeId: String
    assigneeEmail: String
    retryCount: Int
    maxRetries: Int
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
  }

  type WorkflowEvent {
    id: ID!
    eventType: String!
    fromStatus: WorkflowStatus
    toStatus: WorkflowStatus
    actorId: String
    actorEmail: String
    message: String
    createdAt: DateTime!
  }

  type Workflow {
    id: ID!
    name: String!
    description: String
    status: WorkflowStatus!
    type: WorkflowType!
    ownerId: String!
    ownerEmail: String
    currentStep: Int
    totalSteps: Int
    priority: Priority
    errorMessage: String
    startedAt: DateTime
    completedAt: DateTime
    dueDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    steps: [WorkflowStep!]!
    events: [WorkflowEvent!]!
    owner: User
    progressPercent: Float
  }

  type WorkflowPage {
    content: [Workflow!]!
    totalElements: Int!
    totalPages: Int!
    number: Int!
    size: Int!
  }

  type DashboardStats {
    total: Int!
    running: Int!
    pending: Int!
    completed: Int!
    failed: Int!
    waitingApproval: Int!
    overdue: Int!
    recentCount: Int!
    byType: JSON
  }

  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String
    lastName: String
    fullName: String
    department: String
    jobTitle: String
    avatarUrl: String
    isActive: Boolean!
    roles: [String!]!
    createdAt: DateTime!
  }

  type UserPage {
    results: [User!]!
    count: Int!
  }

  type Role {
    id: ID!
    name: String!
    description: String
    permissions: [String!]!
    userCount: Int!
  }

  type AuthPayload {
    access: String!
    refresh: String!
    user: User!
  }

  type TokenValidation {
    valid: Boolean!
    userId: String
    email: String
    roles: [String!]
    error: String
  }

  type AuditLog {
    id: ID!
    userEmail: String
    action: String!
    resourceType: String!
    resourceId: String
    payload: JSON
    createdAt: DateTime!
  }

  type Query {
    # Workflow queries
    workflows(
      status: WorkflowStatus
      type: WorkflowType
      ownerId: String
      page: Int
      size: Int
    ): WorkflowPage!

    workflow(id: ID!): Workflow

    dashboardStats: DashboardStats!

    # Auth/User queries
    users(department: String, role: String, isActive: Boolean): UserPage!
    user(id: ID!): User
    me: User

    roles: [Role!]!

    auditLogs(userId: ID, action: String): [AuditLog!]!

    validateToken(token: String!): TokenValidation!

    checkPermission(userId: ID!, resource: String!, action: String!): Boolean!

    # Service health
    serviceHealth: ServiceHealth!
  }

  type ServiceHealth {
    workflowService: HealthStatus!
    authService: HealthStatus!
    gateway: HealthStatus!
  }

  type HealthStatus {
    status: String!
    service: String!
  }

  type Mutation {
    # Workflow mutations
    createWorkflow(input: CreateWorkflowInput!): Workflow!
    startWorkflow(id: ID!): Workflow!
    pauseWorkflow(id: ID!): Workflow!
    cancelWorkflow(id: ID!, reason: String): Workflow!
    retryWorkflow(id: ID!): Workflow!
    approveStep(workflowId: ID!, stepId: ID!, comment: String): Workflow!

    # Auth mutations
    login(email: String!, password: String!): AuthPayload!
    createUser(input: CreateUserInput!): User!
    assignRole(userId: ID!, role: String!): Boolean!
  }

  input CreateWorkflowInput {
    name: String!
    description: String
    type: WorkflowType!
    ownerId: String!
    ownerEmail: String
    priority: Priority
    dueDate: DateTime
    steps: [CreateStepInput!]
  }

  input CreateStepInput {
    stepOrder: Int!
    name: String!
    description: String
    type: StepType!
    assigneeId: String
    assigneeEmail: String
    maxRetries: Int
    timeoutSeconds: Int
  }

  input CreateUserInput {
    email: String!
    username: String!
    password: String!
    firstName: String
    lastName: String
    department: String
    jobTitle: String
    roles: [String!]
  }
`;

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    workflows: async (_, args, { dataSources }) => {
      const params = new URLSearchParams();
      if (args.status) params.set('status', args.status);
      if (args.type) params.set('type', args.type);
      if (args.ownerId) params.set('ownerId', args.ownerId);
      if (args.page !== undefined) params.set('page', args.page);
      if (args.size !== undefined) params.set('size', args.size);

      const { data } = await dataSources.workflowAPI.get(`/api/workflows?${params}`);
      return {
        content: data.content || [],
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
        number: data.number || 0,
        size: data.size || 20,
      };
    },

    workflow: async (_, { id }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.get(`/api/workflows/${id}`);
      return data;
    },

    dashboardStats: async (_, __, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.get('/api/workflows/stats');
      return data;
    },

    users: async (_, args, { dataSources }) => {
      const params = new URLSearchParams();
      if (args.department) params.set('department', args.department);
      if (args.role) params.set('role', args.role);
      if (args.isActive !== undefined) params.set('is_active', args.isActive);

      const { data } = await dataSources.authAPI.get(`/api/users/?${params}`);
      return { results: data.results || data, count: data.count || (data.results || data).length };
    },

    user: async (_, { id }, { dataSources }) => {
      const { data } = await dataSources.authAPI.get(`/api/users/${id}/`);
      return data;
    },

    me: async (_, __, { dataSources, token }) => {
      const { data } = await dataSources.authAPI.get('/api/auth/me/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },

    roles: async (_, __, { dataSources }) => {
      const { data } = await dataSources.authAPI.get('/api/roles/');
      return data.results || data;
    },

    auditLogs: async (_, args, { dataSources }) => {
      const params = new URLSearchParams();
      if (args.userId) params.set('user_id', args.userId);
      if (args.action) params.set('action', args.action);
      const { data } = await dataSources.authAPI.get(`/api/audit-logs/?${params}`);
      return data.results || data;
    },

    validateToken: async (_, { token }, { dataSources }) => {
      try {
        const { data } = await dataSources.authAPI.post('/api/auth/validate/', { token });
        return data;
      } catch {
        return { valid: false, error: 'Invalid token' };
      }
    },

    checkPermission: async (_, { userId, resource, action }, { dataSources }) => {
      const { data } = await dataSources.authAPI.get(
        `/api/permissions/check/?user_id=${userId}&resource=${resource}&action=${action}`
      );
      return data.has_permission;
    },

    serviceHealth: async (_, __, { dataSources }) => {
      const [wfHealth, authHealth] = await Promise.allSettled([
        dataSources.workflowAPI.get('/api/workflows/health'),
        dataSources.authAPI.get('/api/health/'),
      ]);
      return {
        workflowService: wfHealth.status === 'fulfilled'
          ? wfHealth.value.data
          : { status: 'DOWN', service: 'workflow-service' },
        authService: authHealth.status === 'fulfilled'
          ? authHealth.value.data
          : { status: 'DOWN', service: 'auth-service' },
        gateway: { status: 'UP', service: 'graphql-gateway' },
      };
    },
  },

  Mutation: {
    createWorkflow: async (_, { input }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post('/api/workflows', input);
      return data;
    },

    startWorkflow: async (_, { id }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post(`/api/workflows/${id}/start`);
      return data;
    },

    pauseWorkflow: async (_, { id }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post(`/api/workflows/${id}/pause`);
      return data;
    },

    cancelWorkflow: async (_, { id, reason }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post(`/api/workflows/${id}/cancel`, { reason });
      return data;
    },

    retryWorkflow: async (_, { id }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post(`/api/workflows/${id}/retry`);
      return data;
    },

    approveStep: async (_, { workflowId, stepId, comment }, { dataSources }) => {
      const { data } = await dataSources.workflowAPI.post(
        `/api/workflows/${workflowId}/steps/${stepId}/approve`,
        { comment }
      );
      return data;
    },

    login: async (_, { email, password }, { dataSources }) => {
      const { data } = await dataSources.authAPI.post('/api/auth/login/', { email, password });
      return { access: data.access, refresh: data.refresh, user: data.user };
    },

    createUser: async (_, { input }, { dataSources }) => {
      const { data } = await dataSources.authAPI.post('/api/users/', {
        email: input.email,
        username: input.username,
        password: input.password,
        first_name: input.firstName || '',
        last_name: input.lastName || '',
        department: input.department || '',
        job_title: input.jobTitle || '',
        roles: input.roles || [],
      });
      return data;
    },

    assignRole: async (_, { userId, role }, { dataSources }) => {
      await dataSources.authAPI.post(`/api/users/${userId}/assign-role/`, { role });
      return true;
    },
  },

  Workflow: {
    progressPercent: (workflow) => {
      if (!workflow.totalSteps || workflow.totalSteps === 0) return 0;
      return Math.round((workflow.currentStep / workflow.totalSteps) * 100);
    },
  },

  User: {
    fullName: (user) => `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    firstName: (user) => user.first_name || user.firstName,
    lastName: (user) => user.last_name || user.lastName,
    jobTitle: (user) => user.job_title || user.jobTitle,
    avatarUrl: (user) => user.avatar_url || user.avatarUrl,
    isActive: (user) => user.is_active ?? user.isActive ?? true,
    createdAt: (user) => user.created_at || user.createdAt,
  },
};

// ─── Server Setup ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

const workflowAPI = axios.create({ baseURL: WORKFLOW_URL, timeout: 10000 });
const authAPI = axios.create({ baseURL: AUTH_URL, timeout: 10000 });

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return {
      token,
      dataSources: { workflowAPI, authAPI },
    };
  },
}));

app.get('/health', (_, res) => res.json({ status: 'UP', service: 'graphql-gateway' }));

app.listen(PORT, () => {
  console.log(`🚀 GraphQL Gateway running at http://localhost:${PORT}/graphql`);
});
