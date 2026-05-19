import numpy as np
import cv2
import os


# Dynamically locate the tarangwatch backend public spectrograms directory
# This ensures it works on both Windows and Linux and saves images where they can be served statically.
current_dir = os.path.dirname(os.path.abspath(__file__))
SPECTROGRAM_DIR = os.path.abspath(os.path.join(current_dir, "..", "backend", "public", "spectrograms"))
os.makedirs(SPECTROGRAM_DIR, exist_ok=True)

WIDTH = 400
HEIGHT = 80


def generate(psd_array: list, event_id: str) -> str:
    """
    Convert normalized PSD array (0-100) to a
    400x80 spectrogram PNG using the INFERNO colormap.
    Returns file path.
    """
    arr = np.array(psd_array, dtype=np.float32)

    # Resize to WIDTH points
    arr_resized = np.interp(
        np.linspace(0, len(arr)-1, WIDTH),
        np.arange(len(arr)),
        arr
    )

    # Normalize to 0-255
    arr_normalized = (arr_resized / 100.0 * 255).astype(np.uint8)

    # Create HEIGHT x WIDTH image (repeat rows for height)
    img = np.tile(arr_normalized, (HEIGHT, 1))

    # Apply INFERNO colormap
    colored = cv2.applyColorMap(img, cv2.COLORMAP_INFERNO)

    path = os.path.join(SPECTROGRAM_DIR, f"{event_id}.png")
    cv2.imwrite(path, colored)
    # Return the static URL relative path for backend serving rather than the local filesystem path
    return f"/spectrograms/{event_id}.png"
