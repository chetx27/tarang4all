# TarangWatch: Technical Architecture & System Design

This document details the software architecture, data flows, signal processing pipeline, database design, and cognitive memory schemas that power **TarangWatch**—a real-time, distributed SIGINT HF spectrum monitor and transmitter fingerprinting dashboard.

---

## 1. System Topology & Flow Diagram

```mermaid
graph TD
    subgraph Signal Processing Node (Python)
        SDR1[KiwiSDR Delhi] -->|Raw IQ Audio via WS| Client[KiwiSDRClient]
        SDR2[KiwiSDR Mumbai] -->|Raw IQ Audio via WS| Client
        SDR3[KiwiSDR Bengaluru] -->|Raw IQ Audio via WS| Client
        DemoMode[MockKiwiSDRClient] -.->|Simulated RF Ingestion| Client
        Client -->|IQFrame Bytes| FFT[FFTProcessor]
        FFT -->|Hann Window & FFT PSD| AD[AnomalyDetector]
        AD -->|Ingest Payload + OpenCV Spectrogram PNG| BackendAPI[Express Backend: /api/anomalies/ingest]
    end

    subgraph Central Control Dashboard & Memory (Node.js/Express)
        BackendAPI -->|Fingerprint Match & LLM Analysis| HS[Hindsight Memory Layer]
        HS -->|Vector Search & Similarity Gain| DB[(Supabase PostgreSQL / pgvector)]
        BackendAPI -->|Socket.io Broadcast| Socket[SocketService]
        Socket -->|Real-Time State Broadcast| UI[Vite React Operator Interface]
    end

    subgraph Cognitive Intelligence (LLM)
        HS -->|In-Context Reflection & Recommendations| LLM[Groq / Ollama Llama-3]
    end
```

---

## 2. Distributed Signal Processing Pipeline

The ingestion node is built in Python to maximize low-latency math operations and raw binary handling:

### 2.1 KiwiSDR Client (`kiwisdr_client.py`)
- Establishes persistent WebSocket connections to public KiwiSDR nodes in India (`ws://[host]:[port]/kiwi/[time]/SND`).
- Subscribes to compressed audio channels (USB mode) tuned to scanned high-frequency (HF) bands.
- In **Demo Mode** (`--demo`), the socket is bypassed by a high-fidelity software simulator (`MockKiwiSDRClient`) which generates Gaussian thermal noise mixed with realistic transmitter profiles (bursts, voice narrowband, hopping carriers, wideband sweepers) at 12,000 Hz.

### 2.2 FFT Engine (`fft_processor.py`)
- Captures samples into rolling overlapping queues of 4,096 points.
- Applies a **Hann window** function to minimize spectral leakage across bins.
- Performs Fast Fourier Transform using `numpy.fft.rfft` to extract real-valued Power Spectral Density (PSD).
- Dynamically maintains a rolling baseline mean and standard deviation for each node's frequencies across a rolling window of 50 frames.

### 2.3 Anomaly Detector (`anomaly_detector.py`)
- Calculates the **Z-score** for each frequency bin: 
  $$\text{Z-score} = \frac{\text{PSD}_{\text{current}} - \mu_{\text{baseline}}}{\sigma_{\text{baseline}}}$$
- Triggers a detection candidate if any bin exceeds a dynamic threshold of $3.0\sigma$.
- Identifies signal parameters: Peak Frequency, estimated Bandwidth bucket (`narrow`, `medium`, `wide`), Signal Class (`BURST`, `HOPPING`, `UNLICENSED_NARROWBAND`, `UNLICENSED_WIDEBAND`), Duration, and Peak Power.
- Invokes OpenCV (`cv2`) in `spectrogram.py` to translate raw PSD arrays into high-density 400x80 thermal heatmaps using `COLORMAP_INFERNO` and saves them in the backend's static public folder.

---

## 3. Backend Express & Socket API

The backend is built in TypeScript with Express to handle data enrichment, database storage, and low-latency broadcast:

- **Socket.io Service (`socketService.ts`)**: Establishes high-performance binary connections with React clients. On connection, it pushes the initial 30 aggregated anomalies, node coordinates, and active fingerprints.
- **Node Status Tracker (`nodes.ts`)**: Receives periodic sweeps from the Python nodes, maps scanning frequencies to virtual columns, and alerts the operator interface of node offline/online transitions.
- **Anomaly Ingestion (`anomalies.ts`)**: Bridges incoming RF data with vector databases, executes LLM pattern matching, and manages dynamic fingerprint confidence scoring.

---

## 4. Supabase DB Schema & Memory Layout

```sql
-- Active Software Defined Receivers
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

-- Fingerprinted RF Transmitter Memory Profiles
CREATE TABLE fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL,
  primary_frequency_mhz DECIMAL(8,4) NOT NULL,
  primary_city VARCHAR(50) NOT NULL,
  cities_detected TEXT[] NOT NULL DEFAULT '{}',
  detection_count INTEGER NOT NULL DEFAULT 1,
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  avg_burst_duration_ms INTEGER,
  avg_cycle_hours DECIMAL(6,2),
  signal_class VARCHAR(50) NOT NULL,
  time_pattern_description VARCHAR(255),
  pattern_intelligence TEXT,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- RF Anomaly Events
CREATE TABLE anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  fingerprint_id UUID REFERENCES fingerprints(id) ON DELETE SET NULL,
  city VARCHAR(50) NOT NULL,
  peak_frequency_mhz DECIMAL(8,4) NOT NULL,
  peak_power_db DECIMAL(5,2) NOT NULL,
  bandwidth_khz DECIMAL(6,2) NOT NULL,
  duration_ms INTEGER NOT NULL,
  threat_level VARCHAR(20) NOT NULL DEFAULT 'low',
  signal_class VARCHAR(50) NOT NULL,
  is_burst BOOLEAN DEFAULT false,
  is_frequency_hopping BOOLEAN DEFAULT false,
  psd_array INTEGER[] NOT NULL DEFAULT '{}',
  spectrogram_path VARCHAR(255),
  pattern_analysis TEXT,
  recommended_action TEXT,
  llm_model_used VARCHAR(50),
  llm_latency_ms INTEGER DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Cognitive Hindsight Memory Layer

Instead of alerting on isolated spikes, TarangWatch utilizes **Hindsight Memory** to correlate past behaviors:

1. **Hash Generation**: Standard parameters are hashed deterministically:
   $$\text{SHA256}(\text{Round}(\text{Freq}) \parallel \text{Bandwidth Bucket} \parallel \text{Signal Class})$$
2. **Confidence Dynamics**:
   - Detections scale transmitter confidence incrementally: $+12\%$ gain on repeated cycles.
   - LLM cognitive assessment score modulates confidence scaling based on structural matches in prior logs.
3. **Skywave Cross-City Correlation**: If a fingerprint's unique signature is recorded in Delhi, and subsequently matches a signature in Mumbai with a slight delay, the hindsight layer tags the pattern as an **ionospheric skywave skip** or coordinated military/unlicensed trans-regional transmission array.

---

## 6. Language Model Heuristics (LLM)

For every isolated anomaly, an LLM (Groq Llama-3-70b or Ollama fallback) evaluates context:

- **Prompt Pattern**:
  ```text
  You are a SIGINT RF Analyst. Analyze this high-frequency transmitter trigger:
  - Frequency: {peak_frequency_mhz} MHz ({city})
  - Signal class: {signal_class}
  - Bandwidth: {bandwidth_khz} kHz, Duration: {duration_ms} ms, Peak: {peak_power_db} dBm
  - Previous occurrence count: {prior_count}
  - Target system confidence: {current_confidence}%
  
  Correlate this event with known spectrum bands (amateur, military beacons, radar, marine, numbers stations). Formulate a pattern analysis and a clear recommended operator/defense action.
  ```
- **Response Format**: Returns structured JSON parsing `pattern_analysis`, `recommended_action`, and a threat level upgrade modifier.
