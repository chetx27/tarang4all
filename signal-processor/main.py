import os
import sys
import time
import signal
import queue
import threading
from dotenv import load_dotenv

load_dotenv()

from kiwisdr_client import KiwiSDRClient, SCAN_FREQUENCIES_KHZ
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
clients: list[KiwiSDRClient] = []

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


def main():
    if not wait_for_backend():
        sys.exit(1)

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
        print(f"[Main] Started client: {node_cfg['name']}")

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
