import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const PORT = process.env.PORT || 4000;
const GRAPHQL_URL = process.env.GRAPHQL_GATEWAY_URL || 'http://localhost:4001/graphql';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
const WORKFLOW_WS_URL = process.env.WORKFLOW_SERVICE_WS || 'ws://localhost:8080/ws/workflows';

const app = express();
const server = createServer(app);
const cache = new NodeCache({ stdTTL: 30 }); // 30s cache

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 500 });
app.use('/api/', limiter);

// ─── WebSocket Hub ────────────────────────────────────────────────────────────
// Connected dashboard clients
const dashboardClients = new Map(); // clientId -> { ws, subscriptions, userId }

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  dashboardClients.set(clientId, { ws, subscriptions: new Set(['ALL']), userId: null });
  console.log(`[WS] Client connected: ${clientId} (total: ${dashboardClients.size})`);

  // Send welcome + current stats
  sendToClient(clientId, {
    type: 'CONNECTED',
    clientId,
    message: 'Real-time workflow updates active',
    timestamp: new Date().toISOString(),
  });

  // Send cached stats immediately
  const cachedStats = cache.get('dashboard_stats');
  if (cachedStats) {
    sendToClient(clientId, { type: 'STATS_UPDATE', data: cachedStats });
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const client = dashboardClients.get(clientId);
      if (!client) return;

      if (msg.type === 'SUBSCRIBE') {
        msg.topics?.forEach(t => client.subscriptions.add(t));
        sendToClient(clientId, { type: 'SUBSCRIBED', topics: [...client.subscriptions] });
      } else if (msg.type === 'PING') {
        sendToClient(clientId, { type: 'PONG', timestamp: new Date().toISOString() });
      } else if (msg.type === 'SET_USER') {
        client.userId = msg.userId;
      }
    } catch (e) {
      console.error('[WS] Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    dashboardClients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId} (remaining: ${dashboardClients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error ${clientId}:`, err.message);
    dashboardClients.delete(clientId);
  });
});

function sendToClient(clientId, data) {
  const client = dashboardClients.get(clientId);
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
  }
}

function broadcastToAll(data) {
  const msg = JSON.stringify(data);
  dashboardClients.forEach(({ ws }, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else {
      dashboardClients.delete(clientId);
    }
  });
}

function broadcastToTopic(topic, data) {
  const msg = JSON.stringify(data);
  dashboardClients.forEach(({ ws, subscriptions }, clientId) => {
    if (ws.readyState === WebSocket.OPEN && (subscriptions.has(topic) || subscriptions.has('ALL'))) {
      ws.send(msg);
    }
  });
}

// ─── Connect to Workflow Service WebSocket (upstream) ─────────────────────────
let upstreamWs = null;

function connectToWorkflowService() {
  try {
    upstreamWs = new WebSocket(WORKFLOW_WS_URL);

    upstreamWs.on('open', () => {
      console.log('[UPSTREAM WS] Connected to workflow service');
      broadcastToAll({ type: 'SERVICE_STATUS', service: 'workflow', status: 'connected' });
    });

    upstreamWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // Fan out to all dashboard clients
        broadcastToTopic('WORKFLOWS', {
          type: 'WORKFLOW_UPDATE',
          ...msg,
          receivedAt: new Date().toISOString(),
        });
        // Invalidate stats cache
        cache.del('dashboard_stats');
      } catch (e) {
        console.error('[UPSTREAM WS] Parse error:', e.message);
      }
    });

    upstreamWs.on('close', () => {
      console.log('[UPSTREAM WS] Disconnected, reconnecting in 5s...');
      broadcastToAll({ type: 'SERVICE_STATUS', service: 'workflow', status: 'disconnected' });
      setTimeout(connectToWorkflowService, 5000);
    });

    upstreamWs.on('error', (err) => {
      console.error('[UPSTREAM WS] Error:', err.message);
    });
  } catch (e) {
    console.error('[UPSTREAM WS] Connection failed, retrying in 5s:', e.message);
    setTimeout(connectToWorkflowService, 5000);
  }
}

// Try connecting to upstream (graceful failure if not running)
setTimeout(() => {
  try { connectToWorkflowService(); } catch {}
}, 3000);

// ─── Aggregated API Routes ────────────────────────────────────────────────────

// GraphQL proxy with caching
app.post('/api/graphql', async (req, res) => {
  try {
    const cacheKey = JSON.stringify(req.body);
    const cached = cache.get(cacheKey);
    if (cached && req.body.query?.trim().startsWith('query')) {
      return res.json({ ...cached, cached: true });
    }

    const { data } = await axios.post(GRAPHQL_URL, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      timeout: 15000,
    });

    if (!data.errors && req.body.query?.trim().startsWith('query')) {
      cache.set(cacheKey, data, 15);
    }

    res.json(data);
  } catch (err) {
    console.error('[GraphQL Proxy]', err.message);
    res.status(502).json({ errors: [{ message: 'GraphQL gateway unavailable' }] });
  }
});

// Dashboard aggregated endpoint — ONE call returns everything the dashboard needs
// This is the "40% fewer round-trips" optimization
app.get('/api/dashboard', async (req, res) => {
  const cacheKey = 'dashboard_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const [statsRes, workflowsRes, usersRes] = await Promise.allSettled([
      axios.get(`${GRAPHQL_URL.replace('/graphql', '')}/api/workflows/stats`),
      axios.post(GRAPHQL_URL, {
        query: `query {
          workflows(size: 10) {
            content {
              id name status type priority ownerId ownerEmail
              currentStep totalSteps createdAt updatedAt
            }
            totalElements
          }
        }`,
      }),
      axios.get(`${AUTH_URL}/api/users/?page_size=5`),
    ]);

    const result = {
      stats: statsRes.status === 'fulfilled' ? statsRes.value.data : null,
      recentWorkflows: workflowsRes.status === 'fulfilled'
        ? workflowsRes.value.data?.data?.workflows
        : null,
      recentUsers: usersRes.status === 'fulfilled'
        ? (usersRes.value.data?.results || [])
        : [],
      generatedAt: new Date().toISOString(),
      connectedClients: dashboardClients.size,
    };

    cache.set(cacheKey, result, 10);
    cache.set('dashboard_stats', result.stats, 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth proxy
app.use('/api/auth', async (req, res) => {
  try {
    const { data, status } = await axios({
      method: req.method,
      url: `${AUTH_URL}/api/auth${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
    });
    res.status(status).json(data);
  } catch (err) {
    res.status(err.response?.status || 502).json(err.response?.data || { error: err.message });
  }
});

// WebSocket metrics
app.get('/api/ws/metrics', (req, res) => {
  res.json({
    connectedClients: dashboardClients.size,
    upstreamConnected: upstreamWs?.readyState === WebSocket.OPEN,
    clients: [...dashboardClients.entries()].map(([id, { subscriptions, userId }]) => ({
      id, userId, subscriptions: [...subscriptions]
    })),
  });
});

// Broadcast test endpoint (dev only)
app.post('/api/ws/broadcast', (req, res) => {
  broadcastToAll(req.body);
  res.json({ sent: true, clients: dashboardClients.size });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'bff-server',
    connectedClients: dashboardClients.size,
    upstreamWs: upstreamWs?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
    cacheKeys: cache.keys().length,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 BFF Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket hub at ws://localhost:${PORT}/ws`);
  console.log(`📊 Dashboard API at http://localhost:${PORT}/api/dashboard`);
});
