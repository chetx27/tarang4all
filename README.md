# TarangWatch

A distributed, autonomous high-frequency spectrum audit and intelligence platform designed to isolate, catalog, and analyze anomalous transmissions in real time.

## Operational Overview

Radio spectrum surveillance is critical for regional security and network auditing, yet transient and undocumented signals often go unnoticed. TarangWatch solves this by maintaining continuous, multi-node monitoring over high-frequency (HF) bands across the Indian subcontinent.

Through a distributed network of software-defined receivers (SDRs), the system analyzes digital signal characteristics, evaluates potential threats, and maps long-term behavioral heuristics of unregistered transmitters.

## Core Capabilities

### Autonomous Spectral Scanning
TarangWatch actively connects to remote SDR antennas in Delhi, Mumbai, and Bengaluru, ingesting real-time raw IQ audio feeds. The Python-based signal processing pipeline applies windowed Fast Fourier Transforms (FFT) to convert signal power into continuous spectral density data.

### Deep Pattern Isolation
Signals that deviate from established allocations are classified using standard signal parameters (bandwidth, duration, peak power, and frequency hopping). Those flagged as anomalies are isolated, cataloged, and assigned cryptographic hashes.

### Cognitive Fingerprinting and Memory
Instead of analyzing alerts in isolation, the platform builds a persistent, long-term cognitive memory layer. Utilizing vector embeddings (Supabase pgvector) and the Hindsight Memory SDK, it correlates new detections against historic profiles to track transmission cycles, schedules, and multi-city signal propagation.

### High-Density Operator Interface
A low-latency, dark-themed control panel provides operators with real-time Area Charts, live telemetry tickers, an integrated pattern vault, and natural language intelligence briefs compiled using advanced language models (Groq Llama-3).

## Architecture

- Ingest Node: Python 3.11, WebSocket client, NumPy, SciPy (FFT Processor)
- Control Server: Node.js, Express, TypeScript, Socket.io
- Database and Memory: Supabase PostgreSQL (pgvector), Hindsight Memory SDK
- Dashboard: React 18, Vite, Zustand, TailwindCSS, Recharts

## Initialization

Configure environment variables in `.env` inside the relevant project directories.

```bash
# Ingest Server
cd backend
npm install
npm run dev

# Operator Dashboard
cd frontend
npm install
npm run dev

# DSP Pipeline
cd signal-processor
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```
