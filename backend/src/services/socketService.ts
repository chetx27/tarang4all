import { Server, Socket } from 'socket.io'
import { supabase } from '../db/supabase'

export function setupSocketHandlers(io: Server): void {

  io.on('connection', async (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // Send current state on connect
    try {
      const [anomalies, fingerprints, nodes] =
        await Promise.all([
          supabase
            .from('anomaly_events')
            .select('*')
            .order('detected_at', { ascending: false })
            .limit(30),
          supabase
            .from('fingerprints')
            .select('*')
            .order('confidence_score', { ascending: false }),
          supabase
            .from('nodes')
            .select('*')
        ])

      socket.emit('initial_state', {
        anomalies: anomalies.data ?? [],
        fingerprints: fingerprints.data ?? [],
        nodes: nodes.data ?? []
      })
    } catch (e) {
      console.error('[Socket] Initial state failed:', e)
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })

    socket.on('request_intelligence_brief', async () => {
      const { getIntelligenceBrief } = await import('./hindsightService')
      const brief = await getIntelligenceBrief()
      socket.emit('intelligence_brief', {
        summary: brief,
        generatedAt: new Date().toISOString()
      })
    })
  })
}

export function emitAnomalyDetected(
  io: Server, anomaly: any
): void {
  io.emit('anomaly_detected', anomaly)
}

export function emitFingerprintUpdated(
  io: Server, fingerprint: any
): void {
  io.emit('fingerprint_updated', fingerprint)
}

export function emitFingerprintCreated(
  io: Server, fingerprint: any
): void {
  io.emit('fingerprint_created', fingerprint)
}

export function emitNodeStatusChanged(
  io: Server, node: any
): void {
  io.emit('node_status_changed', node)
}
