export type SignalClass =
  | 'LICENSED_BROADCAST'
  | 'LICENSED_AMATEUR'
  | 'UNLICENSED_NARROWBAND'
  | 'UNLICENSED_WIDEBAND'
  | 'BURST_TRANSMISSION'
  | 'FREQUENCY_HOPPING'
  | 'UNKNOWN'

export type ThreatLevel = 'low' | 'medium' | 'high'

export type FingerprintStatus =
  | 'monitoring'
  | 'pattern_detected'
  | 'high_confidence'
  | 'archived'

export interface AnomalyEvent {
  id: string
  nodeId: string
  nodeName: string
  city: string
  detectedAt: string
  peakFrequencyMhz: number
  peakPowerDb: number
  bandwidthHz: number
  durationMs: number
  signalClass: SignalClass
  isLicensed: boolean
  isBurst: boolean
  isFrequencyHopping: boolean
  classifierConfidence: number
  psdArray: number[]
  spectrogramPath: string | null
  fingerprintId: string | null
  fingerprintMatch: FingerprintMatch | null
  llmModelUsed: string
  llmLatencyMs: number
  usedFallback: boolean
  threatLevel: ThreatLevel
  patternAnalysis: string
  recommendedAction: string
}

export interface FingerprintMatch {
  fingerprintId: string
  fingerprintHash: string
  detectionCount: number
  confidenceScore: number
  isNewMatch: boolean
  previousConfidence: number
  patternIntelligence: string
}

export interface Fingerprint {
  id: string
  fingerprintHash: string
  firstDetectedAt: string
  lastDetectedAt: string
  detectionCount: number
  confidenceScore: number
  primaryFrequencyMhz: number
  frequencyVarianceHz: number
  primaryCity: string
  citiesDetected: string[]
  timePatternDescription: string | null
  avgBurstDurationMs: number | null
  avgCycleHours: number | null
  signalClass: SignalClass
  patternIntelligence: string | null
  hindsightMemoryId: string | null
  status: FingerprintStatus
  createdAt: string
  updatedAt: string
}

export interface NodeStatus {
  id: string
  name: string
  city: string
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastSeen: string | null
  totalScans: number
  totalAnomalies: number
  currentFrequencyKhz: number | null
}

export interface SystemStats {
  totalScans: number
  totalAnomalies: number
  totalFingerprints: number
  highConfidenceFingerprints: number
  llmCallsToday: number
  uptimeSeconds: number
}
