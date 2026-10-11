"""Step 7: frame-rate audio features -> out/features.f32 + out/features.json.

60 rows per second (hop 735 @ 44.1 kHz, centred windows: row r describes t = r/60). Channels:
rms, rms_drums, rms_bass, rms_vocals, rms_other, onset, onset_drums, centroid, flux, mel_00..mel_15.
Each channel is mapped to 0..1 with its p1/p99 over non-silent rows (mix peak > -60 dBFS; for stem RMS channels
only rows where that stem is above -50 dBFS, so a silent stem reads 0), then clipped.
Loudness-like channels are normalised in dB, centroid in log2(Hz)."""
import json
import numpy as np
import librosa
from common import load, write_json, OUT, SR, HOP, FPS

N_FFT = 2048
mix = load("mix")
rows = int(np.ceil(len(mix) / HOP)) + 1
raw = {}


def fit(x):
    x = np.asarray(x, dtype=np.float64)
    return np.pad(x, (0, max(0, rows - len(x))), mode="edge")[:rows]


def rms_db(y):
    return 20 * np.log10(librosa.feature.rms(y=y, frame_length=N_FFT, hop_length=HOP, center=True)[0] + 1e-6)


raw["rms"] = fit(rms_db(mix))
for s in ["drums", "bass", "vocals", "other"]:
    raw[f"rms_{s}"] = fit(rms_db(load(s)))

S = np.abs(librosa.stft(mix, n_fft=N_FFT, hop_length=HOP, center=True))
mel128 = librosa.feature.melspectrogram(S=S ** 2, sr=SR, n_mels=128, fmin=30, fmax=16000)
raw["onset"] = fit(librosa.onset.onset_strength(S=librosa.power_to_db(mel128), sr=SR, hop_length=HOP))
dr = load("drums")
raw["onset_drums"] = fit(librosa.onset.onset_strength(y=dr, sr=SR, hop_length=HOP, n_fft=N_FFT))
raw["centroid"] = fit(np.log2(librosa.feature.spectral_centroid(S=S, sr=SR)[0] + 1.0))
Sn = S / (S.sum(0, keepdims=True) + 1e-9)
fl = np.sqrt((np.maximum(0, np.diff(Sn, axis=1, prepend=Sn[:, :1])) ** 2).sum(0))
raw["flux"] = fit(fl)
mel16 = librosa.power_to_db(librosa.feature.melspectrogram(S=S ** 2, sr=SR, n_mels=16, fmin=30, fmax=16000))
for b in range(16):
    raw[f"mel_{b:02d}"] = fit(mel16[b])

names = (["rms", "rms_drums", "rms_bass", "rms_vocals", "rms_other", "onset", "onset_drums", "centroid", "flux"]
         + [f"mel_{b:02d}" for b in range(16)])
peak = np.abs(mix)
row_peak = np.array([peak[max(0, r * HOP - HOP // 2): r * HOP + HOP // 2 + 1].max(initial=0) for r in range(rows)])
active = row_peak > 10 ** (-60 / 20)

data = np.zeros((rows, len(names)), dtype=np.float32)
norm = {}
for c, n in enumerate(names):
    x = raw[n]
    sel = active & (x > -50) if n.startswith("rms_") else active  # stems: over rows where the stem itself sounds
    lo, hi = np.percentile(x[sel], 1), np.percentile(x[sel], 99)
    data[:, c] = np.clip((x - lo) / (hi - lo + 1e-12), 0, 1)
    norm[n] = {"p1": round(float(lo), 6), "p99": round(float(hi), 6)}

data.astype("<f4").tofile(OUT / "features.f32")
write_json("features.json", {
    "file": "features.f32",
    "dtype": "float32 little-endian",
    "layout": "row-major [rows][channels]",
    "fps": FPS,
    "rows": rows,
    "channels": names,
    "time_of_row": "t = row / 60 seconds of song time (analysis windows are centred on t; n_fft 2048, hop 735)",
    "range": "0..1 (clipped)",
    "normalisation": "per channel: (x - p1) / (p99 - p1) over non-silent rows (mix peak > -60 dBFS); rms_drums/bass/vocals/other use only rows where that stem is above -50 dBFS, so a silent stem reads 0",
    "units_before_normalisation": {
        "rms*": "dBFS of frame RMS (mix and each demucs stem)",
        "onset": "librosa onset strength of the 128-band log-mel mix (spectral flux)",
        "onset_drums": "librosa onset strength of the drums stem",
        "centroid": "log2(spectral centroid Hz + 1) of the mix",
        "flux": "L2 norm of the positive change of the L1-normalised magnitude spectrum",
        "mel_00..mel_15": "dB of 16 mel bands 30 Hz - 16 kHz of the mix (00 = lowest)",
    },
    "p1_p99": norm,
})
print(f"rows={rows} channels={len(names)} bytes={data.nbytes} active={active.mean():.3f}")
print("means:", {n: round(float(data[active, c].mean()), 3) for c, n in enumerate(names[:9])})
