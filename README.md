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
