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
  node_id: string
  node_name: string
  city: string
  detected_at: string
  peak_frequency_mhz: number
  peak_power_db: number
  bandwidth_hz: number
  duration_ms: number
  signal_class: SignalClass
  is_licensed: boolean
  is_burst: boolean
  is_frequency_hopping: boolean
  classifier_confidence: number
  psd_array: number[]
  spectrogram_path: string | null
  fingerprint_id: string | null
  fingerprint_hash?: string
  fingerprintMatch: FingerprintMatch | null
  llm_model_used: string
  llm_latency_ms: number
  used_fallback: boolean
  threat_level: ThreatLevel
  pattern_analysis: string
  recommended_action: string
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
  fingerprint_hash: string
  first_detected_at: string
  last_detected_at: string
  detection_count: number
  confidence_score: number
  primary_frequency_mhz: number
  frequency_variance_hz: number
  primary_city: string
  cities_detected: string[]
  time_pattern_description: string | null
  avg_burst_duration_ms: number | null
  avg_cycle_hours: number | null
  signal_class: SignalClass
  pattern_intelligence: string | null
  hindsight_memory_id: string | null
  status: FingerprintStatus
  created_at: string
  updated_at: string
}

export interface NodeStatus {
  id: string
  name: string
  city: string
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  last_seen: string | null
  total_scans: number
  total_anomalies: number
  current_frequency_khz: number | null
  frequency_range_low_mhz?: number
  frequency_range_high_mhz?: number
}

export interface SystemStats {
  totalScans: number
  totalAnomalies: number
  totalFingerprints: number
  highConfidenceFingerprints: number
  llmCallsToday: number
  uptimeSeconds: number
}

export type Panel = 
  | 'spectrum'
  | 'anomalies'
  | 'vault'

export interface IntelligenceBrief {
  summary: string
  model: string
  generatedAt: string
}

export interface InitialState {
  anomalies: AnomalyEvent[]
  fingerprints: Fingerprint[]
  nodes: NodeStatus[]
}
