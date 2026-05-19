import requests
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

DEMO_FINGERPRINT_HASH = (
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6"
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
)

payload = {
    "event_id": str(uuid.uuid4()),
    "node_name": "Delhi-Alpha",
    "city": "Delhi",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "peak_frequency_mhz": 14.235,
    "peak_power_db": -67.6,
    "bandwidth_hz": 2400.0,
    "duration_ms": 298.0,
    "psd_array": [50.0] * 256,
    "fingerprint_hash": DEMO_FINGERPRINT_HASH,
    "signal_class": "BURST_TRANSMISSION",
    "is_licensed": False,
    "is_burst": True,
    "is_frequency_hopping": False,
    "classifier_confidence": 0.68,
    "threat_level": "medium",
    "assessment": {
        "threat_level": "medium",
        "pattern_analysis": (
            "Seventh confirmed occurrence of burst "
            "on 14.235 MHz. 47-hour cycle now highly "
            "consistent across all detections."
        ),
        "recommended_action": (
            "Flag frequency for continued monitoring. "
            "Pattern suggests scheduled transmission."
        ),
        "confidence_adjustment": 3.1,
        "model_used": "llama3-70b-8192",
        "provider": "groq",
        "latency_ms": 847,
        "used_fallback": False
    }
}

resp = requests.post(
    f"{BACKEND_URL}/api/anomalies/ingest",
    json=payload,
    timeout=10
)

if resp.status_code == 201:
    print("Demo detection sent successfully.")
    print("Watch the Fingerprint Vault — "
          "Delhi 14.235 MHz confidence should jump.")
else:
    print(f"Failed: {resp.status_code} {resp.text}")
