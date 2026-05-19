TarangWatch
A distributed, autonomous high-frequency spectrum audit and intelligence platform designed to isolate, catalog, and analyze anomalous transmissions in real time.
Operational Overview
Radio spectrum surveillance is critical for regional security and network auditing, yet transient and undocumented signals often go unnoticed. TarangWatch solves this by maintaining continuous, multi-node monitoring over high-frequency (HF) bands across the Indian subcontinent.
Through a distributed network of software-defined receivers (SDRs), the system analyzes digital signal characteristics, evaluates potential threats, and maps long-term behavioral heuristics of unregistered transmitters.
Core Capabilities
Autonomous Spectral Scanning
TarangWatch actively connects to remote SDR antennas in Delhi, Mumbai, and Bengaluru, ingesting real-time raw IQ audio feeds. The Python-based signal processing pipeline applies windowed Fast Fourier Transforms (FFT) to convert signal power into continuous spectral density data.
Deep Pattern Isolation
Signals that deviate from established allocations are classified using standard signal parameters (bandwidth, duration, peak power, and frequency hopping). Those flagged as anomalies are isolated, cataloged, and assigned cryptographic hashes.
Cognitive Fingerprinting and Memory
Instead of analyzing alerts in isolation, the platform builds a persistent, long-term cognitive memory layer. Utilizing vector embeddings (Supabase pgvector) and the Hindsight Memory SDK, it correlates new detections against historic profiles to track transmission cycles, schedules, and multi-city signal propagation.
High-Density Operator Interface
A low-latency, dark-themed control panel provides operators with real-time Area Charts, live telemetry tickers, an integrated pattern vault, and natural language intelligence briefs compiled using advanced language models (Groq Llama-3).
Architecture
Ingest Node: Python 3.11, WebSocket client, NumPy, SciPy (FFT Processor)
Control Server: Node.js, Express, TypeScript, Socket.io
Database and Memory: Supabase PostgreSQL (pgvector), Hindsight Memory SDK
Dashboard: React 18, Vite, Zustand, TailwindCSS, Recharts
Environment Variables
Each sub-project has its own `.env.example` file. Copy it to `.env` and fill in your credentials before starting the service.
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp signal-processor/.env.example signal-processor/.env
```
Backend (`backend/.env`)
Variable	Description
`SUPABASE_URL`	Your Supabase project URL — find it in Project Settings → API
`SUPABASE_ANON_KEY`	Supabase anon/public key (safe for server-side calls)
`SUPABASE_SERVICE_ROLE_KEY`	Supabase service-role key — keep this secret, never expose it client-side
`GROQ_API_KEY`	API key for Groq Llama-3 — obtain from console.groq.com/keys
`HINDSIGHT_API_KEY`	API key from your Hindsight Memory dashboard
`HINDSIGHT_PROJECT_ID`	Project ID from your Hindsight Memory dashboard
`PORT`	HTTP port for the Express server (default: `3000`)
`WEBSOCKET_PORT`	Port for the Socket.io WebSocket server (default: `8080`)
`WEBSOCKET_HOST`	Hostname for the WebSocket server (default: `localhost`)
`NODE_ENV`	Runtime environment — `development` or `production`
Frontend (`frontend/.env`)
> All frontend variables **must** be prefixed with `VITE_` to be exposed to the browser bundle.
Variable	Description
`VITE_BACKEND_URL`	URL of the running backend Express server (e.g. `http://localhost:3000`)
`VITE_WEBSOCKET_URL`	WebSocket endpoint for live signal telemetry (e.g. `ws://localhost:8080`)
`VITE_SUPABASE_URL`	Same as `SUPABASE_URL` — safe to expose in the browser
`VITE_SUPABASE_ANON_KEY`	Same as `SUPABASE_ANON_KEY` — safe to expose in the browser
Signal Processor (`signal-processor/.env`)
Variable	Description
`SDR_HOST`	Hostname/IP of the remote SDR antenna node
`SDR_PORT`	TCP port exposed by the SDR server (`rtl_tcp` default: `1234`)
`SUPABASE_URL`	Your Supabase project URL
`SUPABASE_ANON_KEY`	Supabase anon/public key
`SUPABASE_SERVICE_ROLE_KEY`	Supabase service-role key
`HINDSIGHT_API_KEY`	Hindsight Memory SDK API key
`HINDSIGHT_PROJECT_ID`	Hindsight Memory SDK project ID
`BACKEND_WS_URL`	WebSocket URL of the backend to push processed signals to
`SAMPLE_RATE`	SDR sample rate in Hz (e.g. `250000`, `2048000`)
`CENTER_FREQ`	Centre frequency in Hz to tune the SDR to (e.g. `100000000` for 100 MHz)
`FFT_SIZE`	FFT window size — must be a power of 2 (e.g. `1024`)
Initialization
Obtain credentials
Create a Supabase project and enable the `pgvector` extension.
Get a Groq API key.
Set up a Hindsight Memory SDK project and copy its API key and project ID.
Copy and fill in environment files
```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp signal-processor/.env.example signal-processor/.env
   ```
Start each service
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
> **Security note:** Never commit `.env` files to version control. The `.gitignore` already excludes them. Only commit the `.env.example` files with placeholder values.
