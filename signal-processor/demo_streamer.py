import time
import json
import socketio
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to backend
backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
print(f"Connecting to backend Socket.io server at: {backend_url}")

sio = socketio.Client()

@sio.event
def connect():
    print("Demo streamer connected to backend via Socket.io")

@sio.event
def disconnect():
    print("Demo streamer disconnected")

def generate_fake_fft(bins=512):
    base = np.random.normal(0.2, 0.05, bins)
    # Add fake signal spikes
    spike = np.random.randint(100, 400)
    base[spike:spike+30] += np.random.uniform(0.8, 1.5, 30)
    return (base * 100).tolist()

try:
    sio.connect(backend_url)
    
    while True:
        data = {
            "city": "Bengaluru",
            "timestamp": time.time(),
            "fft_data": generate_fake_fft(),
            "peak_freq": 14235,
            "snr": round(np.random.uniform(12, 28), 1),
            "anomaly_score": round(np.random.uniform(0.65, 0.95), 2)
        }
        sio.emit('spectrum_update', data)
        print(f"Emitted spectrum_update: peak={data['peak_freq']} MHz, snr={data['snr']} dB")
        
        if np.random.random() < 0.25:  # 25% chance of anomaly
            anomaly_payload = {
                "city": "Bengaluru",
                "freq": 14235,
                "type": "Unidentified Burst",
                "confidence": 0.89
            }
            sio.emit('anomaly_detected', anomaly_payload)
            print(f"🚨 Emitted anomaly_detected: {anomaly_payload}")
            
        time.sleep(4)  # Update every 4 seconds

except KeyboardInterrupt:
    print("\nStopping demo streamer...")
    sio.disconnect()
except Exception as e:
    print(f"Connection error: {e}")
