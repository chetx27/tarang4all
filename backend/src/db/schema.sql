-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- KiwiSDR nodes
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  kiwisdr_host VARCHAR(255) NOT NULL,
  kiwisdr_port INTEGER NOT NULL DEFAULT 8073,
  frequency_range_low_mhz DECIMAL NOT NULL DEFAULT 0.5,
  frequency_range_high_mhz DECIMAL NOT NULL DEFAULT 30.0,
  status VARCHAR(20) DEFAULT 'connecting',
  last_seen TIMESTAMPTZ,
  total_scans INTEGER DEFAULT 0,
  total_anomalies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw anomaly events from signal processor
CREATE TABLE anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id),
  node_name VARCHAR(50),
  city VARCHAR(50),
  detected_at TIMESTAMPTZ NOT NULL,
  peak_frequency_mhz DECIMAL NOT NULL,
  peak_power_db DECIMAL NOT NULL,
  bandwidth_hz DECIMAL NOT NULL,
  duration_ms DECIMAL NOT NULL,
  signal_class VARCHAR(50) NOT NULL,
  is_licensed BOOLEAN DEFAULT false,
  is_burst BOOLEAN DEFAULT false,
  is_frequency_hopping BOOLEAN DEFAULT false,
  classifier_confidence DECIMAL,
  psd_array JSONB,
  spectrogram_path VARCHAR(255),
  fingerprint_id UUID,
  llm_model_used VARCHAR(100),
  llm_latency_ms INTEGER,
  threat_level VARCHAR(20) DEFAULT 'low',
  pattern_analysis TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persistent fingerprints (core memory layer)
CREATE TABLE fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL,
  first_detected_at TIMESTAMPTZ NOT NULL,
  last_detected_at TIMESTAMPTZ NOT NULL,
  detection_count INTEGER DEFAULT 1,
  confidence_score DECIMAL DEFAULT 10.0,
  primary_frequency_mhz DECIMAL NOT NULL,
  frequency_variance_hz DECIMAL DEFAULT 0,
  primary_city VARCHAR(50) NOT NULL,
  cities_detected JSONB DEFAULT '[]',
  time_pattern_description TEXT,
  avg_burst_duration_ms DECIMAL,
  avg_cycle_hours DECIMAL,
  signal_class VARCHAR(50),
  pattern_intelligence TEXT,
  hindsight_memory_id VARCHAR(255),
  embedding vector(1536),
  status VARCHAR(30) DEFAULT 'monitoring',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM call log (lightweight, no cascadeflow)
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_event_id UUID REFERENCES anomaly_events(id),
  called_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(100),
  provider VARCHAR(50),
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  used_fallback BOOLEAN DEFAULT false,
  output_summary TEXT
);

-- Indexes
CREATE INDEX idx_anomaly_events_detected_at
  ON anomaly_events(detected_at DESC);
CREATE INDEX idx_anomaly_events_city
  ON anomaly_events(city);
CREATE INDEX idx_fingerprints_confidence
  ON fingerprints(confidence_score DESC);
CREATE INDEX idx_fingerprints_hash
  ON fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprints_embedding
  ON fingerprints USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Seed nodes
INSERT INTO nodes
  (name, city, kiwisdr_host, kiwisdr_port,
   frequency_range_low_mhz, frequency_range_high_mhz)
VALUES
  ('Delhi-Alpha',     'Delhi',     'FIND_FROM_KIWISDR', 8073, 0.5, 30.0),
  ('Mumbai-Alpha',    'Mumbai',    'FIND_FROM_KIWISDR', 8073, 0.5, 30.0),
  ('Bengaluru-Alpha', 'Bengaluru', 'FIND_FROM_KIWISDR', 8073, 0.5, 30.0);
