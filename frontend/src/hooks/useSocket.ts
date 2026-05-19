import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useTarangStore } from '../store/tarangStore'

let socket: Socket | null = null

export function useSocket() {
  const store = useTarangStore()

  useEffect(() => {
    if (socket?.connected) return

    socket = io(
      import.meta.env.VITE_BACKEND_URL
      || 'http://localhost:3001'
    )

    socket.on('connect', () => {
      store.setSocketConnected(true)
      console.log('[Socket] Connected')
    })

    socket.on('disconnect', () => {
      store.setSocketConnected(false)
      console.log('[Socket] Disconnected')
    })

    socket.on('initial_state', store.loadInitialState)
    socket.on('anomaly_detected', store.handleAnomalyDetected)
    socket.on('fingerprint_updated',
      store.handleFingerprintUpdated)
    socket.on('fingerprint_created',
      store.handleFingerprintCreated)
    socket.on('node_status_changed',
      store.handleNodeStatusChanged)
    socket.on('intelligence_brief',
      store.handleIntelligenceBrief)

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [])

  return {
    isConnected: useTarangStore((s) => s.isSocketConnected),
    requestBrief: () =>
      socket?.emit('request_intelligence_brief')
  }
}
