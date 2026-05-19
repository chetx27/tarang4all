import numpy as np
from scipy.signal import windows
from scipy.signal import welch
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
import hashlib
import json
import queue
import threading
import collections


@dataclass
class AnomalyCandidate:
    event_id: str
    node_name: str
    city: str
    timestamp: str
    peak_frequency_mhz: float
    peak_power_db: float
    bandwidth_hz: float
    duration_ms: float
    psd_array: list          # 256 points, normalized for viz
    fingerprint_hash: str    # deterministic hash of signal


FRAME_SIZE = 4096
SAMPLE_RATE = 12000
ANOMALY_THRESHOLD_STD = 3.0
ROLLING_WINDOW = 50          # frames per node for baseline


class FFTProcessor:
    def __init__(self, frame_queue: queue.Queue,
                 anomaly_queue: queue.Queue):
        self.frame_queue = frame_queue
        self.anomaly_queue = anomaly_queue
        self.running = False
        # Rolling baseline per node
        self._baselines: dict[str, collections.deque] = {}

    def start(self):
        self.running = True
        threading.Thread(
            target=self._process_loop,
            daemon=True
        ).start()

    def _process_loop(self):
        while self.running:
            try:
                frame = self.frame_queue.get(timeout=1.0)
                result = self._process_frame(frame)
                if result:
                    self.anomaly_queue.put(result)
            except queue.Empty:
                continue

    def _process_frame(self, frame) -> Optional[AnomalyCandidate]:
        samples = frame.samples
        if len(samples) < FRAME_SIZE:
            return None

        # Take most recent FRAME_SIZE samples
        chunk = samples[-FRAME_SIZE:]

        # Apply Hann window
        window = windows.hann(FRAME_SIZE)
        windowed = chunk * window

        # FFT
        fft_result = np.fft.rfft(windowed)
        freqs = np.fft.rfftfreq(FRAME_SIZE, d=1.0/SAMPLE_RATE)

        # Power spectral density in dB
        psd = 20 * np.log10(np.abs(fft_result) + 1e-10)

        # Update rolling baseline for this node
        node = frame.node_name
        if node not in self._baselines:
            self._baselines[node] = collections.deque(
                maxlen=ROLLING_WINDOW
            )
        self._baselines[node].append(psd)

        if len(self._baselines[node]) < 10:
            return None  # Need baseline first

        baseline_arr = np.array(self._baselines[node])
        rolling_mean = np.mean(baseline_arr, axis=0)
        rolling_std = np.std(baseline_arr, axis=0) + 1e-10
        z_scores = (psd - rolling_mean) / rolling_std

        # Find anomalous bins
        anomalous_bins = np.where(
            z_scores > ANOMALY_THRESHOLD_STD
        )[0]
        if len(anomalous_bins) == 0:
            return None

        # Extract peak
        peak_bin = anomalous_bins[np.argmax(psd[anomalous_bins])]
        peak_freq_hz = freqs[peak_bin]
        peak_freq_mhz = (
            (frame.frequency_khz * 1000 + peak_freq_hz) / 1e6
        )
        peak_power_db = float(psd[peak_bin])

        # Estimate bandwidth (bins above threshold)
        bandwidth_hz = float(
            len(anomalous_bins) * (SAMPLE_RATE / FRAME_SIZE)
        )

        # Estimate duration from sample rate
        duration_ms = float(
            (FRAME_SIZE / SAMPLE_RATE) * 1000
        )

        # Downsample PSD to 256 points for frontend
        psd_downsampled = np.interp(
            np.linspace(0, len(psd)-1, 256),
            np.arange(len(psd)),
            psd
        ).tolist()

        # Normalize psd for viz: 0-100 range
        psd_min = min(psd_downsampled)
        psd_max = max(psd_downsampled)
        psd_range = psd_max - psd_min + 1e-10
        psd_normalized = [
            round((v - psd_min) / psd_range * 100, 1)
            for v in psd_downsampled
        ]

        # Deterministic fingerprint hash
        hash_input = json.dumps({
            "freq_mhz_rounded": round(peak_freq_mhz, 1),
            "bandwidth_bucket": self._bandwidth_bucket(bandwidth_hz),
            "city": frame.city
        }, sort_keys=True)
        fingerprint_hash = hashlib.sha256(
            hash_input.encode()
        ).hexdigest()

        import uuid
        return AnomalyCandidate(
            event_id=str(uuid.uuid4()),
            node_name=frame.node_name,
            city=frame.city,
            timestamp=frame.timestamp,
            peak_frequency_mhz=round(peak_freq_mhz, 4),
            peak_power_db=round(peak_power_db, 2),
            bandwidth_hz=round(bandwidth_hz, 1),
            duration_ms=round(duration_ms, 1),
            psd_array=psd_normalized,
            fingerprint_hash=fingerprint_hash
        )

    def _bandwidth_bucket(self, hz: float) -> str:
        if hz < 3000:    return "narrow"
        if hz < 10000:   return "medium"
        return "wide"
