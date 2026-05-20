# tarang(watch) - it catches what no one else does !

it’s 2:47 a.m. over the Indian subcontinent.  
somewhere in the HF band, a short burst fires at 14.235 MHz.  
no callsign. no license. no operator logging it.  
gone in less than two seconds.

no human hears it. no conventional monitoring system flags it.  
nothing changes. until weeks later, the same burst appears again.

this time, **tarangwatch** is listening.

it matches the spectral fingerprint. raises the alert.  
writes the brief. remembers the waveform.

that’s the idea behind tarang:  
a live, AI‑augmented HF spectrum watcher that sees patterns  
where humans and static rules don’t.

---

## what this project is

**tarangwatch** is a real‑time HF radio spectrum monitoring platform  
built for the Indian subcontinent. it connects to public SDR (software‑defined radio)  
nodes in Delhi, Mumbai, and Bengaluru, continuously listens to the airwaves,  
and uses signal‑processing plus AI to detect, fingerprint, and memorize anomalous transmissions.

it’s not just a dashboard. it’s a **cognitive signal‑watcher**:  
- if a rogue transmitter appears today, stays quiet for weeks, and returns  
- tarangwatch recognizes it tomorrow.

---

## the problem

the HF band is chaos.

pirates, jammers, unlicensed operators, experimental bursts — they're all out there, hiding in plain sight. traditional spectrum monitoring in India is manual, under-resourced, and reactive. by the time a human analyst notices something weird, the signal is long gone and the transmitter has moved on.

static rule-based systems aren't much better. they flag everything or nothing. they don't *learn*. they don't *remember*. and they definitely can't tell you "this weird 2-second burst at 14.235 MHz? yeah, we saw something with the same spectral shape three weeks ago, from the same rough bearing."

no one is building cognitive, persistent, AI-augmented monitoring for the Indian subcontinent's HF band.

until now.

---

## what tarang fixes

- **the blindspot problem** — most SDR setups are human-in-the-loop. if no one's watching the waterfall, nothing gets caught. tarang watches 24/7, no babysitting needed.
- **the amnesia problem** — signals disappear and reappear. without memory, every detection is isolated. tarang links past and present via vector embeddings + Hindsight Memory, so patterns across weeks get surfaced automatically.
- **the noise problem** — not every blip is worth an alert. tarang fingerprints anomalies with signal DNA (bandwidth, duration, shape, timing) and scores them before escalating — so you're not drowning in false positives.
- **the jargon problem** — raw FFT output means nothing to a non-engineer. Groq Llama 3 turns spectral stats into plain-language operator briefs. you get *what it is*, *how weird it is*, and *how sure we are*.

---

## where tarang can actually be used

**spectrum regulators & TRAI enforcement**
flag unlicensed transmitters, pirate broadcasters, and interference sources across the HF band — automatically, continuously, with timestamped evidence.

**OUR STAR POINT** - **defence & border monitoring (research / academic context)**
detect unusual burst transmissions near sensitive corridors. useful as a research prototype for low-cost persistent HF surveillance.

**amateur radio & research communities**
log rare propagation events, DX anomalies, and ionospheric skip patterns across Indian SDR nodes. build a crowdsourced signal archive over time.

**disaster response & telecom resilience**
monitor HF emergency bands for irregular or unauthorized activity during blackouts, when HF becomes the fallback channel.

**academic & ML research**
a real-world dataset of HF anomaly fingerprints + vector embeddings is genuinely rare. tarang generates one passively, making it useful for training signal classification models.

---

## what it actually does

- **listens** to live HF radio feeds from three Indian cities via public KiwiSDR nodes.  
  no custom hardware required on your side; you just point at existing waterfall streams.

- **detects** signals that deviate from known allocations  
  using windowed FFT (Fast Fourier Transform) to track power spectral density in real time.

- **fingerprints** every anomaly using a “signal DNA” tuple:  
  bandwidth, duration, peak power, spectral shape, and timing pattern.  
  each fingerprint is hashed and stored along with vector embeddings for similarity search.

- **remembers** across time using:
  - **Supabase PostgreSQL** with **pgvector** for vector‑similarity retrieval  
  - **Hindsight Memory SDK** to build a graph‑like memory of past events and patterns  
  so repeated “rogue” or unknown signals can be linked even if they appear days apart.

- **briefs** operators via **Groq Llama 3** (LPU‑inference)  
  by turning raw spectral statistics into plain‑language summaries:  
  what was detected, how unusual it looks, and how confident the system is.

- **shows** everything on a dark‑mode operator dashboard with:
  - live spectrum charts per city  
  - real‑time telemetry (node status, SNR, CPU, load)  
  - a fingerprint vault where you can inspect, tag, and replay past detections.

---

## tech stack

| layer                  | technology |
|------------------------|-----------|
| signal processing      | Python 3.11, NumPy, SciPy, WebSocket client |
| backend API            | Node.js, Express, TypeScript, Socket.io |
| database & memory      | Supabase (PostgreSQL + pgvector), Hindsight Memory SDK |
| AI intelligence layer  | Groq Llama 3 (via Groq Cloud API) |
| frontend dashboard     | React 18, Vite, Zustand, TailwindCSS, Recharts |
| deployment targets     | Vercel (frontend), Render (backend), Supabase cloud (DB) |

---

## repo structure

```text
tarang4all/
├── frontend/          # React operator dashboard
├── backend/           # Express API + Socket.io server
└── signal-processor/  # Python FFT pipeline + KiwiSDR client
```

---

## setup — run it locally

you need:

- Node.js 18+  
- Python 3.11+  
- a Supabase project (free tier is enough)  
- optionally a Groq API key for Llama 3 reasoning

### 1. clone the repo

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

---

## what's next

tarang is v0. it works. but there's more coming.

more KiwiSDR nodes at Chennai, Hyderabad, Kolkata. TDOA-based direction finding so you know where it transmitted, not just that it did. 

Telegram alerts so you're not glued to the dashboard. a custom signal classifier trained on real accumulated Indian HF fingerprint data — not just FFT heuristics. a public anonymized signal archive for researchers and regulators. and eventually, a low-cost plug-in hardware node that auto-registers with the tarang grid. no KiwiSDR dependency. just plug it in, point it up, and it starts feeding.

**India has one of the most active HF corridors in the world and almost zero automated cognitive monitoring over it. tarang is the first step toward changing that.**

it's not a research paper. it's not a concept. it runs. it listens. it remembers.
the airwaves don't lie. tarang just finally starts paying attention.

⭐ if this is useful, interesting, or just cool to you — star the repo. it helps more than you think.

---