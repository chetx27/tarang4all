import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")


def seed():
    with open("data/seed_transmissions.json") as f:
        data = json.load(f)

    print(f"Seeding {len(data['fingerprints'])} fingerprints...")

    for i, fp in enumerate(data["fingerprints"]):
        resp = requests.post(
            f"{BACKEND_URL}/api/fingerprints/seed",
            json=fp,
            timeout=15
        )
        if resp.status_code in (200, 201):
            print(f"  [{i+1}] Seeded: "
                  f"{fp['primary_frequency_mhz']} MHz "
                  f"{fp['primary_city']} "
                  f"({fp['confidence_score']}%)")
        else:
            print(f"  [{i+1}] Failed: {resp.status_code} "
                  f"{resp.text[:80]}")

    print("\nSeed complete.")
    print("Fingerprint Vault should show 8 fingerprints.")
    print("Highest confidence: 84.9% (Delhi 14.235 MHz)")
    print("Run trigger_demo.py during demo.")


if __name__ == "__main__":
    seed()
