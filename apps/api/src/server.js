import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { getDb } from './db/database.js'
import { startAllPolling, subscribe } from './services/deviceService.js'
import { startDiscovery, stopDiscovery } from './services/discoveryService.js'
import { deviceRoutes } from './routes/devices.js'
import { settingsRoutes } from './routes/settings.js'
import { groupRoutes } from './routes/groups.js'
import { configRoutes } from './routes/config.js'
import { automationRoutes } from './routes/automation.js'
import { spatialRoutes } from './routes/spatial.js'
import { studioRoutes } from './routes/studio.js'
import { startAutomationScheduler, stopAutomationScheduler } from './services/automationService.js'

// ─── Configuration ────────────────────────────────────────────────────────────

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = parseInt(process.env.PORT ?? '3001', 10)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const IS_PROD = process.env.NODE_ENV === 'production'

// ─── Server Setup ─────────────────────────────────────────────────────────────

const fastify = Fastify({
  logger: IS_PROD
    ? true
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
      },
})

await fastify.register(cors, {
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
})

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 second',
  errorResponseBuilder: () => ({ error: 'Rate limit exceeded' }),
})

await fastify.register(websocket)

// ─── Static Frontend (production only) ───────────────────────────────────────

if (IS_PROD) {
  const distPath = join(__dirname, '../../../web/dist')
  await fastify.register(staticFiles, {
    root: distPath,
    prefix: '/',
    decorateReply: false,
  })
  // SPA fallback: return index.html for all non-API routes
  fastify.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html', distPath)
  })
}

// ─── Health Check ─────────────────────────────────────────────────────────────

fastify.get('/api/health', async () => ({
  status: 'ok',
  version: '0.4.0',
  uptime: process.uptime(),
}))

// ─── Routes ───────────────────────────────────────────────────────────────────

await fastify.register(async (api) => {
  await api.register(deviceRoutes)
  await api.register(settingsRoutes)
  await api.register(groupRoutes)
  await api.register(configRoutes)
  await api.register(automationRoutes)
  await api.register(spatialRoutes)
  await api.register(studioRoutes)
}, { prefix: '/api' })

// ─── WebSocket: Live State Push ───────────────────────────────────────────────

fastify.get('/ws', { websocket: true }, (socket) => {
  console.log('[ws] Client connected')

  const unsubscribe = subscribe((deviceId, state) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ type: 'state_update', deviceId, state }))
    }
  })

  socket.on('close', () => {
    console.log('[ws] Client disconnected')
    unsubscribe()
  })
})

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  // Initialize DB (runs migrations)
  getDb()

  // Start polling all known devices
  startAllPolling()

  // Start mDNS discovery
  startDiscovery()

  // Start automation scheduler
  startAutomationScheduler()

  try {
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`[server] WLEDashboard API listening on http://${HOST}:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n[server] Shutting down...')
  stopDiscovery()
  stopAutomationScheduler()
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  stopDiscovery()
  stopAutomationScheduler()
  await fastify.close()
  process.exit(0)
})

start()
