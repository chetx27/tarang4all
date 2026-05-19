import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { testConnection } from './db/supabase'
import { initializeHindsight } from './services/hindsightService'
import { setupSocketHandlers } from './services/socketService'
import anomalyRoutes from './routes/anomalies'
import fingerprintRoutes from './routes/fingerprints'
import nodeRoutes from './routes/nodes'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Make io accessible in routes
app.set('io', io)

// Routes
app.use('/api/anomalies', anomalyRoutes)
app.use('/api/fingerprints', fingerprintRoutes)
app.use('/api/nodes', nodeRoutes)
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime())
  })
})

setupSocketHandlers(io)

async function start() {
  try {
    await testConnection()
  } catch (err) {
    console.warn('Database connection warning (falling back to dynamic queries):', err)
  }
  
  await initializeHindsight()

  const PORT = process.env.PORT || 3001
  httpServer.listen(PORT, () => {
    console.log(`TarangWatch backend on :${PORT}`)
  })
}

start().catch(err => {
  console.error('Startup failed:', err)
  process.exit(1)
})

export { io }
