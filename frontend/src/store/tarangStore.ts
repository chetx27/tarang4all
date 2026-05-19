import { create } from 'zustand'
import type {
  AnomalyEvent, Fingerprint, NodeStatus,
  Panel, IntelligenceBrief, SignalClass
} from './types'

interface TarangStore {
  // Data
  anomalies: AnomalyEvent[]
  fingerprints: Fingerprint[]
  nodes: NodeStatus[]
  intelligenceBrief: IntelligenceBrief | null
  isSocketConnected: boolean

  // UI
  activePanel: Panel
  activeCityFilter: string | null
  activeSignalFilter: SignalClass | null
  isVaultExpanded: string | null

  // Stats (derived but cached)
  totalScans: number
  uptimeStart: Date

  // Actions
  setActivePanel: (panel: Panel) => void
  setCityFilter: (city: string | null) => void
  setSignalFilter: (signal: SignalClass | null) => void
  setVaultExpanded: (id: string | null) => void
  setSocketConnected: (v: boolean) => void

  // Socket handlers
  loadInitialState: (state: any) => void
  handleAnomalyDetected: (anomaly: AnomalyEvent) => void
  handleFingerprintUpdated: (fp: Fingerprint) => void
  handleFingerprintCreated: (fp: Fingerprint) => void
  handleNodeStatusChanged: (node: NodeStatus) => void
  handleIntelligenceBrief: (brief: IntelligenceBrief) => void

  // Computed
  getFilteredAnomalies: () => AnomalyEvent[]
  getFingerprintById: (id: string) => Fingerprint | undefined
  getConnectedNodeCount: () => number
}

export const useTarangStore = create<TarangStore>(
  (set, get) => ({
    anomalies: [],
    fingerprints: [],
    nodes: [],
    intelligenceBrief: null,
    isSocketConnected: false,
    activePanel: 'spectrum',
    activeCityFilter: null,
    activeSignalFilter: null,
    isVaultExpanded: null,
    totalScans: 0,
    uptimeStart: new Date(),

    setActivePanel: (panel) => set({ activePanel: panel }),
    setCityFilter: (city) => set({ activeCityFilter: city }),
    setSignalFilter: (s) => set({ activeSignalFilter: s }),
    setVaultExpanded: (id) => set({ isVaultExpanded: id }),
    setSocketConnected: (v) => set({ isSocketConnected: v }),

    loadInitialState: (state) => set({
      anomalies: state.anomalies ?? [],
      fingerprints: state.fingerprints ?? [],
      nodes: state.nodes ?? []
    }),

    handleAnomalyDetected: (anomaly) => set((s) => ({
      anomalies: [anomaly, ...s.anomalies].slice(0, 50),
      totalScans: s.totalScans + 1
    })),

    handleFingerprintUpdated: (fp) => set((s) => ({
      fingerprints: s.fingerprints.map(
        (f) => f.id === fp.id ? fp : f
      )
    })),

    handleFingerprintCreated: (fp) => set((s) => ({
      fingerprints: [fp, ...s.fingerprints]
    })),

    handleNodeStatusChanged: (node) => set((s) => ({
      nodes: s.nodes.map(
        (n) => n.id === node.id ? node : n
      )
    })),

    handleIntelligenceBrief: (brief) =>
      set({ intelligenceBrief: brief }),

    getFilteredAnomalies: () => {
      const { anomalies, activeCityFilter,
              activeSignalFilter } = get()
      return anomalies.filter((a) => {
        if (activeCityFilter && a.city !== activeCityFilter)
          return false
        if (activeSignalFilter
            && a.signal_class !== activeSignalFilter)
          return false
        return true
      })
    },

    getFingerprintById: (id) =>
      get().fingerprints.find((f) => f.id === id),

    getConnectedNodeCount: () =>
      get().nodes.filter(
        (n) => n.status === 'connected'
      ).length
  })
)
