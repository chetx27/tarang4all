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

      const mappedNodes = (nodes.data ?? []).map(n => ({
        ...n,
        current_frequency_khz: n.frequency_range_low_mhz ? Math.round(Number(n.frequency_range_low_mhz) * 1000) : null
      }))

      socket.emit('initial_state', {
        anomalies: anomalies.data ?? [],
        fingerprints: fingerprints.data ?? [],
        nodes: mappedNodes
      })
    } catch (e) {
      console.error('[Socket] Initial state failed:', e)
    }
    socket.on('start_demo', () => {
      console.log("[Socket] 🚨 Demo mode activated by judge!");
      if (demoInterval) clearInterval(demoInterval)

      demoInterval = setInterval(() => {
        const bins = 512
        const fft_data: number[] = []
        const timeSec = Date.now() / 1000
        
        // Dynamic sine wave to sweep frequency peaks back and forth for active layout
        const spikeIdx = 200 + Math.floor(Math.sin(timeSec / 8) * 110) + Math.floor(Math.random() * 8)

        for (let i = 0; i < bins; i++) {
          const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.04 + 0.18
          let val = noise

          const dist = Math.abs(i - spikeIdx)
          if (dist < 15) {
            val += Math.exp(-Math.pow(dist, 2) / 35) * (0.9 + Math.random() * 0.4)
          }

          if (Math.floor(timeSec / 6) % 2 === 0) {
            const dist2 = Math.abs(i - 410)
            if (dist2 < 8) {
              val += Math.exp(-Math.pow(dist2, 2) / 12) * 0.65
            }
          }

          fft_data.push(Math.min(100, Math.max(0, Math.round(val * 100))))
        }

        const data = {
          city: "Bengaluru",
          timestamp: timeSec,
          fft_data: fft_data,
          peak_freq: 14235,
          snr: Number((Math.random() * 15 + 12).toFixed(1)),
          anomaly_score: Number((Math.random() * 0.28 + 0.65).toFixed(2))
        }

        io.emit('spectrum_update', data)

        if (Math.random() < 0.18) {
          const newAnomaly = {
            id: Math.random().toString(36).substring(7),
            city: "Bengaluru",
            peak_frequency_mhz: 14.235,
            peak_power_db: -58.4,
            bandwidth_khz: 3.5,
            duration_ms: 120,
            threat_level: Math.random() < 0.3 ? "high" : "medium",
            signal_class: "Unidentified Burst",
            is_burst: true,
            detected_at: new Date().toISOString(),
            psd_array: fft_data.slice(Math.max(0, spikeIdx - 20), Math.min(bins, spikeIdx + 20)),
            spectrogram_path: ""
          }
          io.emit('anomaly_detected', newAnomaly)
        }
      }, 400)
    })

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

let demoInterval: NodeJS.Timeout | null = null


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
