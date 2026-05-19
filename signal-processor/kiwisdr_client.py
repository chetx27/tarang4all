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


class MockKiwiSDRClient:
    def __init__(self, host: str, port: int,
                 node_name: str, city: str,
                 frame_queue: queue.Queue):
         self.host = host
         self.port = port
         self.node_name = node_name
         self.city = city
         self.frame_queue = frame_queue
         self.running = False
         self.status = "disconnected"
         self.total_frames = 0
         
         # Choose target frequencies based on city for realistic simulation
         if self.city == "Delhi":
             self.frequencies = [14235, 18095, 9560]
         elif self.city == "Mumbai":
             self.frequencies = [7073, 10118, 10998]
         else: # Bengaluru
             self.frequencies = [21340, 14150]
             
         self.current_freq_idx = 0
         self.current_freq_khz = self.frequencies[0]
         self._last_tune_time = time.time()
         self._sample_rate = 12000
         self._frame_size = 4096

    def _report_status(self):
         backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
         try:
             url = f"{backend_url}/api/nodes/{self.node_name}/status"
             payload = {
                 "status": "connected" if self.status == "connected" else "disconnected",
                 "currentFrequencyKhz": self.current_freq_khz
             }
             def _do_post():
                 try:
                     requests.post(url, json=payload, timeout=3)
                 except Exception:
                     pass
             threading.Thread(target=_do_post, daemon=True).start()
         except Exception:
             pass

    def connect(self):
         self.running = True
         self.status = "connected"
         self._report_status()
         print(f"[{self.node_name}] Mock client connected (Demo Mode)")
         
         # Start frequency sweep rotation thread
         threading.Thread(
             target=self._rotate_frequencies,
             daemon=True
         ).start()
         
         # Sound generation loop (12000 Hz sample rate)
         # 4096 samples = 0.3413 seconds per frame
         frame_duration = self._frame_size / self._sample_rate
         seq_num = 0
         
         t_start = time.time()
         
         while self.running:
             t_frame_start = time.time()
             
             # Base noise
             samples = np.random.normal(0, 0.02, self._frame_size).astype(np.float32)
             
             # Add simulated signals depending on tuned frequency
             freq = self.current_freq_khz
             t_now = time.time() - t_start
             
             # 1. Burst Signals (14.235 MHz, 18.095 MHz, 14.150 MHz)
             if freq in [14235, 18095, 14150]:
                 # Generate a burst signal every 8 seconds
                 cycle_time = t_now % 8
                 if 2.0 <= cycle_time <= 2.3: # 300ms burst
                     t_vec = np.linspace(0, frame_duration, self._frame_size)
                     # strong carrier at 1000 Hz
                     carrier = np.sin(2 * np.pi * 1000 * t_vec)
                     # smooth burst envelope
                     envelope = np.exp(-((t_vec - 0.15) ** 2) / (2 * (0.05 ** 2)))
                     samples += (carrier * envelope * 0.45).astype(np.float32)
                     
             # 2. Frequency Hopping Signal (10.118 MHz)
             elif freq == 10118:
                 # Generate short hopping bursts every 5 seconds
                 cycle_time = t_now % 5
                 if 1.0 <= cycle_time <= 1.2: # 200ms hop
                     t_vec = np.linspace(0, frame_duration, self._frame_size)
                     # Hop frequency offset changes dynamically
                     hop_offset = 800 + (int(t_now) % 4) * 400
                     carrier = np.sin(2 * np.pi * hop_offset * t_vec)
                     envelope = np.exp(-((t_vec - 0.1) ** 2) / (2 * (0.03 ** 2)))
                     samples += (carrier * envelope * 0.5).astype(np.float32)
                     
             # 3. Wideband Signal (7.073 MHz)
             elif freq == 7073:
                 # Continuous wideband carrier
                 t_vec = np.linspace(0, frame_duration, self._frame_size)
                 # multiple sine waves close to each other to simulate wide bandwidth
                 carrier = np.zeros(self._frame_size)
                 for offset_hz in [800, 1000, 1200, 1400, 1600, 1800, 2000]:
                     carrier += np.sin(2 * np.pi * offset_hz * t_vec)
                 samples += (carrier / 7.0 * 0.35).astype(np.float32)
                 
             # 4. Narrowband voice/carrier (21.340 MHz, 10.998 MHz)
             elif freq in [21340, 10998]:
                 # Continuous single stable sine wave
                 t_vec = np.linspace(0, frame_duration, self._frame_size)
                 carrier = np.sin(2 * np.pi * 1200 * t_vec)
                 samples += (carrier * 0.28).astype(np.float32)
                 
             # Ensure values are within -1.0 to 1.0
             samples = np.clip(samples, -1.0, 1.0)
             
             frame = IQFrame(
                 node_name=self.node_name,
                 city=self.city,
                 timestamp=datetime.now(timezone.utc).isoformat(),
                 frequency_khz=freq,
                 samples=samples,
                 sequence_number=seq_num
             )
             
             try:
                 self.frame_queue.put_nowait(frame)
                 self.total_frames += 1
                 seq_num += 1
             except queue.Full:
                 pass
                 
             # Regulate timing to match real sample rate
             elapsed = time.time() - t_frame_start
             sleep_time = max(0.001, frame_duration - elapsed)
             time.sleep(sleep_time)

    def _rotate_frequencies(self):
         # Rotate frequencies every 15 seconds in demo mode to keep the spectrum active
         while self.running:
             time.sleep(15)
             self.current_freq_idx = (self.current_freq_idx + 1) % len(self.frequencies)
             self.current_freq_khz = self.frequencies[self.current_freq_idx]
             self._report_status()
             print(f"[{self.node_name}] Demo client tuned to {self.current_freq_khz / 1000:.3f} MHz")

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
         self.status = "disconnected"
         self._report_status()

