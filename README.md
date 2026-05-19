# tarang — it catches what no one else does

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
git clone https://github.com/chetx27/tarang4all.git
cd tarang4all
```

### 2. set up Supabase

1. create a new project at [supabase.com](https://supabase.com).  
2. go to **SQL Editor → New query**.  
3. paste and run the schema from:  
   ```text
   backend/src/db/schema.sql
   ```  
4. go to **Settings → API** and copy:
   - Project URL  
   - anon key  
   - service_role key  

---

### 3. configure environment variables

**backend/.env**

```ini
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key
HINDSIGHT_API_KEY=leave-blank-for-mock-mode
HINDSIGHT_NAMESPACE=tarangwatch-v1
```

**frontend/.env**

```ini
VITE_BACKEND_URL=http://localhost:3001
```

**signal-processor/.env**

```ini
BACKEND_URL=http://localhost:3001
KIWISDR_DELHI_HOST=115.112.98.54
KIWISDR_DELHI_PORT=8073
KIWISDR_MUMBAI_HOST=114.143.167.62
KIWISDR_MUMBAI_PORT=8073
KIWISDR_BENGALURU_HOST=122.167.228.91
KIWISDR_BENGALURU_PORT=8073
```

```

- Get a **Groq API key** free at [console.groq.com](https://console.groq.com).  
- Leave `HINDSIGHT_API_KEY` empty if you don’t have access to Hindsight;  
  the system will fall back to mock memory mode automatically.

---

### 4. run all three services

Open **three terminal windows**:

**Terminal 1 — backend**

```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 — signal processor**

```bash
cd signal-processor
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Then open the dashboard at `http://localhost:5173`.  
you should see live spectrum views, node status, and the fingerprint vault.

---

### 5. seed demo data (optional but recommended)

To get a feel without running real HF nodes:

```bash
cd signal-processor
python seed_demo.py    # loads ~8 real transmitter fingerprints
python trigger_demo.py # fires a live mock detection to test real‑time UI
```

This populates the database with sample fingerprints and mimics a detection event,  
so you can walk through the operator flow end‑to‑end.

---

## deploy to production

Order of deployment: **Supabase → backend → frontend → signal‑processor**.

### step 1 — Supabase

already done during local setup.  
your Supabase project keeps:
- the PostgreSQL schema  
- pgvector embeddings  
- detection logs and metadata.

---

### step 2 — backend on Render

1. go to [render.com](https://render.com) → **New Web Service** → connect your repo.  
2. set:
   - **Root directory:** `backend`  
   - **Build command:**  
     ```bash
     npm install && npm run build
     ```  
   - **Start command:**  
     ```bash
     npm start
     ```  
3. under **Advanced → Environment**, add all backend env vars from `backend/.env` above.  
4. deploy and copy the live URL, e.g.:  
   `https://tarangwatch-backend.onrender.com`.

---

### step 3 — frontend on Vercel

1. go to [vercel.com](https://vercel.com) → **New Project** → import the repo.  
2. set:
   - **Root directory:** `frontend`  
   - **Framework preset:** Vite  
3. add an env variable:  
   ```text
   VITE_BACKEND_URL = https://tarangwatch-backend.onrender.com
   ```  
   (replace with your actual Render URL).  
4. deploy and copy the Vercel URL, e.g.:  
   `https://tarang4all.vercel.app`.

---

### step 4 — cross‑update URLs

- In **Render (backend)**: set `FRONTEND_URL` to your Vercel URL.  
- In **signal‑processor/.env**: set `BACKEND_URL` to your Render backend URL.

---

### step 5 — signal processor runtime

Run the **signal‑processor** on:
- a local machine,  
- a home server, or  
- a Raspberry Pi / small Linux box.

It does continuous FFT and WebSocket streaming, which is **not suitable for free cloud tiers**.  
It just needs:
- stable internet to reach your Render backend  
- enough CPU to keep up with ~10–20‑second FFT windows.

Leave it running; it will write new fingerprints and detections to Supabase as it sees them.

---

## live demo

see the dashboard in action:

> [https://tarang4all.vercel.app](https://tarang4all.vercel.app)

---

## design and architecture notes

### why this architecture

- **Python + KiwiSDR WebSockets**  
  gives fine‑grained control over FFT parameters and windowing, while staying lightweight enough to run on a hobby‑grade machine.

- **Node + Socket.io backend**  
  handles real‑time pub/sub between the signal‑processor and multiple dashboards, and glues the AI pipeline together.

- **React + Tailwind**  
  keeps the operator UI crisp, responsive, and easy to extend with new views (e.g., “threat map”, “timeline”, “compare fingerprints”).

- **Supabase + pgvector**  
  lets you query “find signals similar to this one” without managing a separate vector‑database cluster.

- **Groq Llama 3**  
  turns numeric fingerprints into human‑readable briefs, so an operator can triage without deep RF expertise.

---

## why “tarang”

**tarang** (तरंग) means **wave** in Sanskrit and Hindi.  
the HF spectrum is just waves: some licensed, some unintended, some invisible to conventional monitoring.

tarangwatch is built to notice the ones that slip through.

---

## licensing and attribution

This repository is open‑source and released under the **MIT License**, unless otherwise noted in individual files.  

> Copyright (c) 2025 chetx27 and contributors.

For attribution in academic or research work, cite this repo as:

> chetx27, “tarangwatch — HF spectrum monitoring platform”, GitHub, 2025.  
> https://github.com/chetx27/tarang4all

---

## contribution guidelines

We welcome:
- bug fixes to the signal‑processor’s FFT pipeline  
- new visualization modules in the dashboard  
- tests for the backend API and Supabase schema  
- documentation improvements and embedded examples

To contribute:
1. fork the repo  
2. create a new branch (`feat/hf-filter-bank`, `fix/fft-window`, etc.)  
3. open a PR with a clear description and a short scenario explaining the change’s impact.

---

## future roadmap

- **automatic frequency allocation lookup**  
  against ITU‑India and national band‑plans to flag “out‑of‑band” emissions.

- **rogue‑transmitter clustering**  
  using pgvector + Hindsight to group repeated unknowns and estimate “threat persistence”.

- **multi‑city correlation view**  
  to see if a signal appears simultaneously in Delhi, Mumbai, and Bengaluru.

- **operator‑feedback loop**  
  let users tag detections as “harmless amateur”, “known station”, or “unknown risk”,  
  and tune the AI briefs over time.

---

built with 💙 by **chetx27** and team  
tarangwatch — where HF waves don’t go unnoticed.

---

## Initialization & Deployment Guide

Each tier of the TarangWatch ecosystem is modular and can be launched individually. 

### 1. Central Control Server (Backend)
The backend acts as the ingestion point and manages the database state, Socket.io broadcasts, and Hindsight Memory routines.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Node.js packages:
   ```bash
   npm install
   ```
3. Configure the environment by editing the `.env` file with your credentials:
   - `PORT=3001`
   - `SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `GROQ_API_KEY=...`
   - `OLLAMA_HOST=http://localhost:11434`
4. Spin up the development server:
   ```bash
   npm run dev
   ```
   > [!NOTE]
   > On startup, the backend automatically performs a database connection test and verifies if standard Indian spectrum node records are initialized. If the Supabase database is completely empty, it will **automatically seed the required nodes** and establish the initial state flawlessly!

---

### 2. Operator Interface (Frontend Dashboard)
A premium dark dashboard displaying high-density signal Area Charts, a live rolling waterfall spectrogram, and active transmitter logs.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Vite dependencies:
   ```bash
   npm install
   ```
3. Establish environment flags inside `.env`:
   - `VITE_BACKEND_URL=http://localhost:3001`
4. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The browser will automatically serve the operator dashboard on `http://localhost:5173`.

---

### 3. DSP Ingest Node (Signal Processor)
The Python pipeline connects to software-defined receivers, computes Hann-windowed FFT density charts, isolates anomalies, and classifies signals.

1. Navigate to the signal processor directory:
   ```bash
   cd signal-processor
   ```
2. Create and activate a clean Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Ingest required mathematical, binary and network dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. **Choose your operational mode**:
   
   #### A. Live Hardware Scanning Mode (Real KiwiSDR Feeds)
   To stream actual live HF radio IQ data from real physical antennas in India:
   - Ensure the `.env` file contains valid hosts for active receivers.
   - Run the main pipeline:
     ```bash
     python main.py
     ```
   
   #### B. Hardware Simulation / Demonstration Mode (Hardware-in-the-Loop)
   To try the platform immediately without real SDR hardware or an active internet connection:
   - Run with the dynamic `--demo` flag:
     ```bash
     python main.py --demo
     ```
     
   > [!TIP]
   > Running `python main.py --demo` does two high-value actions automatically:
   > 1. It triggers a REST seed call to populate the Supabase DB with standard historic transmitter fingerprints (Delhi, Mumbai, Bengaluru).
   > 2. It activates the `MockKiwiSDRClient` generator to simulate high-fidelity RF feeds—synthesizing real digital bursts, frequency hopping signals, wideband maritime carriers, and narrowband beacons complete with rolling colormapped spectrograms pushed live to your dashboard!
