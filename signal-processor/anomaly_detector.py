import os
import json
import time
import queue
import threading
import requests
from groq import Groq
from dataclasses import asdict

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

LLM_SYSTEM_PROMPT = """You are an HF radio spectrum analyst.
Analyze this anomalous radio transmission and return a JSON
assessment. Be concise, specific, and grounded in signal
characteristics. No speculation beyond what data supports.
Return only valid JSON, no markdown."""

LLM_USER_TEMPLATE = """Anomalous HF transmission detected.

City: {city}
Frequency: {freq} MHz
Signal class: {signal_class}
Duration: {duration}ms
Peak power: {power} dBm
Bandwidth: {bandwidth} Hz
Burst pattern: {is_burst}
Frequency hopping: {is_hopping}
Prior detections (similar signal): {prior_count}
Current fingerprint confidence: {confidence}%
Time: {timestamp}

Return JSON:
{{
  "threat_level": "low|medium|high",
  "pattern_analysis": "one sentence, specific",
  "recommended_action": "one sentence",
  "confidence_adjustment": <float -10 to +10>
}}"""


def assess_anomaly(anomaly_data: dict,
                   prior_count: int,
                   current_confidence: float) -> dict:
    """
    Call Groq for intelligence assessment.
    Fall back to Ollama if Groq unavailable.
    Returns assessment dict.
    """
    prompt = LLM_USER_TEMPLATE.format(
        city=anomaly_data["city"],
        freq=anomaly_data["peak_frequency_mhz"],
        signal_class=anomaly_data["signal_class"],
        duration=anomaly_data["duration_ms"],
        power=anomaly_data["peak_power_db"],
        bandwidth=anomaly_data["bandwidth_hz"],
        is_burst=anomaly_data["is_burst"],
        is_hopping=anomaly_data["is_frequency_hopping"],
        prior_count=prior_count,
        confidence=current_confidence,
        timestamp=anomaly_data["timestamp"]
    )

    start = time.time()

    # Try Groq first
    if groq_client:
        try:
            resp = groq_client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": LLM_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=200
            )
            latency_ms = int((time.time() - start) * 1000)
            raw = resp.choices[0].message.content.strip()
            result = json.loads(raw)
            result["model_used"] = "llama3-70b-8192"
            result["provider"] = "groq"
            result["latency_ms"] = latency_ms
            result["used_fallback"] = False
            return result
        except Exception as e:
            print(f"[LLM] Groq failed: {e}, trying Ollama")

    # Ollama fallback
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": f"{LLM_SYSTEM_PROMPT}\n\n{prompt}",
                "stream": False
            },
            timeout=30
        )
        latency_ms = int((time.time() - start) * 1000)
        raw = resp.json()["response"].strip()
        result = json.loads(raw)
        result["model_used"] = "llama3.2:3b"
        result["provider"] = "ollama"
        result["latency_ms"] = latency_ms
        result["used_fallback"] = True
        return result
    except Exception as e:
        print(f"[LLM] Ollama also failed: {e}")
        # Return safe default
        return {
            "threat_level": "low",
            "pattern_analysis": "Assessment unavailable.",
            "recommended_action": "Monitor for recurrence.",
            "confidence_adjustment": 0.0,
            "model_used": "none",
            "provider": "none",
            "latency_ms": 0,
            "used_fallback": True
        }


def post_to_backend(enriched_anomaly: dict,
                    retries: int = 3) -> bool:
    for attempt in range(retries):
        try:
            resp = requests.post(
                f"{BACKEND_URL}/api/anomalies/ingest",
                json=enriched_anomaly,
                timeout=10
            )
            if resp.status_code == 201:
                return True
        except Exception as e:
            print(f"[Backend] POST failed attempt "
                  f"{attempt+1}: {e}")
            time.sleep(2 ** attempt)
    return False


class AnomalyDetector:
    def __init__(self, anomaly_queue: queue.Queue):
        self.anomaly_queue = anomaly_queue
        self.running = False

    def start(self):
        self.running = True
        threading.Thread(
            target=self._detect_loop,
            daemon=True
        ).start()

    def _detect_loop(self):
        while self.running:
            try:
                candidate = self.anomaly_queue.get(timeout=1.0)
                self._process(candidate)
            except queue.Empty:
                continue

    def _process(self, candidate):
        from classifier import classify
        from spectrogram import generate

        # Classify signal
        classification = classify(
            freq_mhz=candidate.peak_frequency_mhz,
            bandwidth_hz=candidate.bandwidth_hz,
            duration_ms=candidate.duration_ms,
            peak_power_db=candidate.peak_power_db
        )

        # Discard licensed signals (no noise in feed)
        if (classification.is_licensed
                and classification.confidence > 0.85):
            return

        # Generate spectrogram
        spectrogram_path = generate(
            candidate.psd_array,
            candidate.event_id
        )

        # Build payload for backend
        payload = {
            "event_id": candidate.event_id,
            "node_name": candidate.node_name,
            "city": candidate.city,
            "timestamp": candidate.timestamp,
            "peak_frequency_mhz": candidate.peak_frequency_mhz,
            "peak_power_db": candidate.peak_power_db,
            "bandwidth_hz": candidate.bandwidth_hz,
            "duration_ms": candidate.duration_ms,
            "psd_array": candidate.psd_array,
            "spectrogram_path": spectrogram_path,
            "fingerprint_hash": candidate.fingerprint_hash,
            "signal_class": classification.signal_class,
            "is_licensed": classification.is_licensed,
            "is_burst": classification.is_burst,
            "is_frequency_hopping": (
                classification.is_frequency_hopping
            ),
            "classifier_confidence": classification.confidence,
            "threat_level": classification.threat_level
        }

        # Get prior count from backend before LLM call
        try:
            r = requests.get(
                f"{BACKEND_URL}/api/fingerprints/"
                f"hash/{candidate.fingerprint_hash}",
                timeout=5
            )
            fp_data = r.json() if r.status_code == 200 else {}
            prior_count = fp_data.get("detection_count", 0)
            current_confidence = fp_data.get(
                "confidence_score", 0.0
            )
        except Exception:
            prior_count = 0
            current_confidence = 0.0

        # LLM assessment
        assessment = assess_anomaly(
            payload, prior_count, current_confidence
        )
        payload["assessment"] = assessment

        post_to_backend(payload)
