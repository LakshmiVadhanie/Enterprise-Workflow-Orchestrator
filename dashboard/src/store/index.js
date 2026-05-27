import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // WebSocket state
  wsConnected: false,
  wsClientId: null,
  liveUpdates: [],

  // Dashboard data
  stats: null,
  workflows: [],
  totalWorkflows: 0,

  // Filters
  statusFilter: null,
  typeFilter: null,
  searchQuery: '',

  // UI state
  sidebarOpen: true,
  selectedWorkflow: null,
  notifications: [],

  // Actions
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setWsClientId: (id) => set({ wsClientId: id }),

  addLiveUpdate: (update) => set((state) => ({
    liveUpdates: [update, ...state.liveUpdates].slice(0, 50),
  })),

  setStats: (stats) => set({ stats }),
  setWorkflows: (workflows, total) => set({ workflows, totalWorkflows: total }),

  updateWorkflowInList: (workflowId, updates) => set((state) => ({
    workflows: state.workflows.map(w =>
      w.id === workflowId ? { ...w, ...updates } : w
    ),
  })),

  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setTypeFilter: (filter) => set({ typeFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedWorkflow: (wf) => set({ selectedWorkflow: wf }),

  addNotification: (notif) => set((state) => ({
    notifications: [{ id: Date.now(), ...notif }, ...state.notifications].slice(0, 10),
  })),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
}))
