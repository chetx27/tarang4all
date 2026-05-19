import os
import sys
import time
import signal
import queue
import threading
import json
from dotenv import load_dotenv

load_dotenv()

from kiwisdr_client import KiwiSDRClient, MockKiwiSDRClient, SCAN_FREQUENCIES_KHZ
from fft_processor import FFTProcessor
from anomaly_detector import AnomalyDetector
import requests
from fastapi import FastAPI
import uvicorn

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

NODES = [
    {
        "name": "Delhi-Alpha",
        "city": "Delhi",
        "host": os.getenv("KIWISDR_DELHI_HOST", ""),
        "port": int(os.getenv("KIWISDR_DELHI_PORT", "8073"))
    },
    {
        "name": "Mumbai-Alpha",
        "city": "Mumbai",
        "host": os.getenv("KIWISDR_MUMBAI_HOST", ""),
        "port": int(os.getenv("KIWISDR_MUMBAI_PORT", "8073"))
    },
    {
        "name": "Bengaluru-Alpha",
        "city": "Bengaluru",
        "host": os.getenv("KIWISDR_BENGALURU_HOST", ""),
        "port": int(os.getenv("KIWISDR_BENGALURU_PORT", "8073"))
    }
]

frame_queue = queue.Queue(maxsize=2000)
anomaly_queue = queue.Queue(maxsize=500)
clients = []

app = FastAPI(title="TarangWatch Signal Processor")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "nodes": [c.get_status() for c in clients]
    }

@app.get("/stats")
def stats():
    return {
        "frame_queue_size": frame_queue.qsize(),
        "anomaly_queue_size": anomaly_queue.qsize(),
        "nodes": [c.get_status() for c in clients]
    }


def wait_for_backend():
    for attempt in range(5):
        try:
            r = requests.get(
                f"{BACKEND_URL}/health", timeout=3
            )
            if r.status_code == 200:
                print("[Main] Backend reachable")
                return True
        except Exception:
            pass
        print(f"[Main] Backend not ready, "
              f"retry {attempt+1}/5...")
        time.sleep(3)
    print("[Main] Backend unreachable after 5 attempts")
    return False


def seed_demo_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    seed_path = os.path.join(current_dir, "data", "seed_transmissions.json")
    if not os.path.exists(seed_path):
        print(f"[Main] Demo seed file not found at: {seed_path}")
        return
        
    print(f"[Main] Seeding demo fingerprints to backend: {BACKEND_URL}")
    try:
        with open(seed_path, "r") as f:
            data = json.load(f)
            
        for i, fp in enumerate(data.get("fingerprints", [])):
            resp = requests.post(
                f"{BACKEND_URL}/api/fingerprints/seed",
                json=fp,
                timeout=10
            )
            if resp.status_code in (200, 201):
                print(f"  [{i+1}] Seeded fingerprint: {fp['primary_frequency_mhz']} MHz ({fp['primary_city']})")
            else:
                print(f"  [{i+1}] Failed to seed fingerprint: {resp.status_code}")
    except Exception as e:
        print(f"[Main] Seeding error: {e}")


def main():
    demo_mode = "--demo" in sys.argv
    if demo_mode:
        print("[Main] 🛡️ Running in DEMO MODE (simulating hardware / KiwiSDR feeds)")

    if not wait_for_backend():
        sys.exit(1)

    if demo_mode:
        seed_demo_data()

    # Start FFT processor
    fft = FFTProcessor(frame_queue, anomaly_queue)
    fft.start()
    print("[Main] FFT processor started")

    # Start anomaly detector
    detector = AnomalyDetector(anomaly_queue)
    detector.start()
    print("[Main] Anomaly detector started")

    # Start KiwiSDR clients
    for node_cfg in NODES:
        if demo_mode:
            # In demo mode, spin up mock client generators for all nodes
            client = MockKiwiSDRClient(
                host="127.0.0.1",
                port=8073,
                node_name=node_cfg["name"],
                city=node_cfg["city"],
                frame_queue=frame_queue
            )
        else:
            if not node_cfg["host"]:
                print(f"[Main] Skipping {node_cfg['name']}: "
                      f"no host configured")
                continue
            client = KiwiSDRClient(
                host=node_cfg["host"],
                port=node_cfg["port"],
                node_name=node_cfg["name"],
                city=node_cfg["city"],
                frame_queue=frame_queue
            )
            
        clients.append(client)
        threading.Thread(
            target=client.connect,
            daemon=True,
            name=f"kiwi-{node_cfg['name']}"
        ).start()
        print(f"[Main] Started {'mock ' if demo_mode else ''}client: {node_cfg['name']}")

    # FastAPI in background thread
    threading.Thread(
        target=lambda: uvicorn.run(
            app, host="0.0.0.0", port=8001,
            log_level="warning"
        ),
        daemon=True
    ).start()
    print("[Main] Status API on :8001")

    # Graceful shutdown
    def shutdown(sig, frame):
        print("\n[Main] Shutting down...")
        for c in clients:
            c.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    print("[Main] TarangWatch running. Ctrl+C to stop.")
    while True:
        time.sleep(60)
        total_frames = sum(c.total_frames for c in clients)
        print(f"[Main] Heartbeat — "
              f"frames: {total_frames}, "
              f"queue: {frame_queue.qsize()}")


if __name__ == "__main__":
    main()
