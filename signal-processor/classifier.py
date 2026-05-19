from dataclasses import dataclass

# Known licensed HF bands in MHz (ITU Region 3 / India)
LICENSED_BROADCAST_BANDS = [
    (5.9, 6.2), (7.2, 7.45), (9.4, 9.9),
    (11.6, 12.1), (13.57, 13.87), (15.1, 15.83),
    (17.48, 17.9), (18.9, 19.02), (21.45, 21.85),
    (25.67, 26.1)
]

AMATEUR_BANDS = [
    (7.0, 7.3), (10.1, 10.15), (14.0, 14.35),
    (18.068, 18.168), (21.0, 21.45),
    (24.89, 24.99), (28.0, 29.7)
]


@dataclass
class ClassificationResult:
    signal_class: str
    is_licensed: bool
    is_burst: bool
    is_frequency_hopping: bool
    confidence: float
    reasoning: str
    threat_level: str


def classify(
    freq_mhz: float,
    bandwidth_hz: float,
    duration_ms: float,
    peak_power_db: float
) -> ClassificationResult:

    # Check licensed bands first
    for low, high in LICENSED_BROADCAST_BANDS:
        if low <= freq_mhz <= high:
            return ClassificationResult(
                signal_class="LICENSED_BROADCAST",
                is_licensed=True,
                is_burst=False,
                is_frequency_hopping=False,
                confidence=0.90,
                reasoning=f"{freq_mhz} MHz is in ITU "
                           f"HF broadcast allocation",
                threat_level="low"
            )

    for low, high in AMATEUR_BANDS:
        if low <= freq_mhz <= high:
            return ClassificationResult(
                signal_class="LICENSED_AMATEUR",
                is_licensed=True,
                is_burst=False,
                is_frequency_hopping=False,
                confidence=0.80,
                reasoning=f"{freq_mhz} MHz is in amateur "
                           f"radio allocation",
                threat_level="low"
            )

    # Burst detection
    is_burst = duration_ms < 500
    # Frequency hopping: narrow bandwidth, very short duration
    is_hopping = duration_ms < 200 and bandwidth_hz < 3000

    if is_hopping:
        return ClassificationResult(
            signal_class="FREQUENCY_HOPPING",
            is_licensed=False,
            is_burst=True,
            is_frequency_hopping=True,
            confidence=0.72,
            reasoning="Sub-200ms narrow-band transmission "
                       "consistent with frequency hopping",
            threat_level="high"
        )

    if is_burst:
        return ClassificationResult(
            signal_class="BURST_TRANSMISSION",
            is_licensed=False,
            is_burst=True,
            is_frequency_hopping=False,
            confidence=0.68,
            reasoning=f"Short burst ({duration_ms:.0f}ms) "
                       f"on unlicensed frequency",
            threat_level="medium"
        )

    if bandwidth_hz > 10000:
        return ClassificationResult(
            signal_class="UNLICENSED_WIDEBAND",
            is_licensed=False,
            is_burst=False,
            is_frequency_hopping=False,
            confidence=0.60,
            reasoning="Wideband continuous transmission "
                       "outside licensed allocation",
            threat_level="medium"
        )

    return ClassificationResult(
        signal_class="UNLICENSED_NARROWBAND",
        is_licensed=False,
        is_burst=False,
        is_frequency_hopping=False,
        confidence=0.55,
        reasoning="Narrowband continuous transmission "
                   "outside licensed allocation",
        threat_level="low"
    )
