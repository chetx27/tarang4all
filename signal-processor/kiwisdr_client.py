import threading
import queue
import time
import websocket
import numpy as np
import struct
import json
import os
import requests
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class IQFrame:
    node_name: str
    city: str
    timestamp: str          # ISO8601 UTC
    frequency_khz: float
    samples: np.ndarray     # float32, normalized -1.0 to 1.0
    sequence_number: int
    sample_rate: int = 12000


SCAN_FREQUENCIES_KHZ = [7000, 10000, 14000, 18000, 21000]
SCAN_INTERVAL_SECONDS = 30


class KiwiSDRClient:
    def __init__(self, host: str, port: int,
                 node_name: str, city: str,
                 frame_queue: queue.Queue):
         self.host = host
         self.port = port
         self.node_name = node_name
         self.city = city
         self.frame_queue = frame_queue
         self.ws = None
         self.running = False
         self.status = "disconnected"
         self.total_frames = 0
         self.current_freq_idx = 0
         self.current_freq_khz = SCAN_FREQUENCIES_KHZ[0]
         self._reconnect_delay = 2
         self._max_reconnect_delay = 60
         self._last_tune_time = 0

    def _report_status(self):
         backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
         try:
             url = f"{backend_url}/api/nodes/{self.node_name}/status"
             api_status = "connected" if self.status == "connected" else ("connecting" if self.status in ("connecting", "reconnecting") else "disconnected")
             payload = {
                 "status": api_status,
                 "currentFrequencyKhz": self.current_freq_khz
             }
             def _do_post():
                 try:
                     requests.post(url, json=payload, timeout=5)
                 except Exception:
                     pass
             threading.Thread(target=_do_post, daemon=True).start()
         except Exception:
             pass

    def connect(self):
         self.running = True
         while self.running:
             try:
                 self.status = "connecting"
                 self._report_status()
                 ts = int(time.time())
                 url = f"ws://{self.host}:{self.port}/kiwi/{ts}/SND"
                 self.ws = websocket.WebSocketApp(
                     url,
                     on_open=self._on_open,
                     on_message=self._on_message,
                     on_error=self._on_error,
                     on_close=self._on_close
                 )
                 self.ws.run_forever(ping_interval=30)
             except Exception as e:
                 print(f"[{self.node_name}] Connection error: {e}")
             if self.running:
                 self.status = "reconnecting"
                 self._report_status()
                 time.sleep(self._reconnect_delay)
                 self._reconnect_delay = min(
                     self._reconnect_delay * 2,
                     self._max_reconnect_delay
                 )

    def _on_open(self, ws):
         self.status = "connected"
         self._report_status()
         self._reconnect_delay = 2
         print(f"[{self.node_name}] Connected")
         ws.send("SET auth t=kiwi p=")
         time.sleep(0.3)
         self._tune(SCAN_FREQUENCIES_KHZ[0])
         ws.send("SET compression=0")
         ws.send("SET ident_user=TarangWatch")
         ws.send("SET zoom=0 start=0")
         # Start frequency rotation thread
         threading.Thread(
             target=self._rotate_frequencies,
             daemon=True
         ).start()

    def _on_message(self, ws, message):
         if not isinstance(message, bytes) or len(message) < 5:
             return
         frame_type = message[0]
         if frame_type != 0x01:
             return
         seq = struct.unpack('>I', message[1:5])[0]
         raw_samples = np.frombuffer(
             message[5:], dtype=np.int16
         ).astype(np.float32)
         if len(raw_samples) == 0:
             return
         normalized = raw_samples / 32768.0
         frame = IQFrame(
             node_name=self.node_name,
             city=self.city,
             timestamp=datetime.now(timezone.utc).isoformat(),
             frequency_khz=self.current_freq_khz,
             samples=normalized,
             sequence_number=seq
         )
         try:
             self.frame_queue.put_nowait(frame)
             self.total_frames += 1
         except queue.Full:
             pass

    def _on_error(self, ws, error):
         print(f"[{self.node_name}] Error: {error}")
         self.status = "error"
         self._report_status()

    def _on_close(self, ws, code, msg):
         print(f"[{self.node_name}] Closed: {code}")
         self.status = "disconnected"
         self._report_status()

    def _tune(self, freq_khz: float):
         self.current_freq_khz = freq_khz
         self._report_status()
         self._last_tune_time = time.time()
         if self.ws:
             cmd = (f"SET mod=usb low_cut=-5000 "
                    f"high_cut=5000 freq={freq_khz}")
             self.ws.send(cmd)

    def _rotate_frequencies(self):
         while self.running and self.status == "connected":
             time.sleep(SCAN_INTERVAL_SECONDS)
             self.current_freq_idx = (
                 (self.current_freq_idx + 1)
                 % len(SCAN_FREQUENCIES_KHZ)
             )
             self._tune(SCAN_FREQUENCIES_KHZ[self.current_freq_idx])

    def get_status(self) -> dict:
         return {
             "node": self.node_name,
             "city": self.city,
             "status": self.status,
             "total_frames": self.total_frames,
             "current_frequency_khz": self.current_freq_khz,
             "current_frequency_mhz": round(
                 self.current_freq_khz / 1000, 3
             )
         }

    def stop(self):
         self.running = False
         if self.ws:
             self.ws.close()
