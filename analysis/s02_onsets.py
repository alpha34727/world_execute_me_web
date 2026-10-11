"""Step 2: per-stem onsets (drums, vocals) -> out/onsets.json  [{t, s}] with s = strength 0..1."""
import numpy as np
import librosa
from common import load, write_json, SR

HOP = 256  # ~5.8 ms resolution for onset timing


def onsets(y, *, delta, wait_s, fmin=None, fmax=None, lag=1, max_size=1):
    S = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=2048, hop_length=HOP, n_mels=128,
                                       fmin=fmin or 0, fmax=fmax)
    env = librosa.onset.onset_strength(S=librosa.power_to_db(S), sr=SR, hop_length=HOP,
                                       lag=lag, max_size=max_size)
    env = env / (np.percentile(env, 99.5) + 1e-9)
    peaks = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=HOP, units="frames",
                                       backtrack=False, delta=delta, wait=int(wait_s * SR / HOP),
                                       pre_max=3, post_max=3, pre_avg=20, post_avg=5)
    # backtrack to the energy rise so the time is the attack, not the flux peak
    rms = librosa.feature.rms(y=y, frame_length=512, hop_length=HOP)[0]
    bt = librosa.onset.onset_backtrack(peaks, rms)
    out = []
    for p, b in zip(peaks, bt):
        b = b if p - b <= 4 else p - 1  # never backtrack more than ~23 ms
        out.append({"t": round(float(librosa.frames_to_time(b, sr=SR, hop_length=HOP)), 4),
                    "s": round(float(min(env[p], 1.0)), 3)})
    return out


drums = onsets(load("drums"), delta=0.07, wait_s=0.06, lag=1, max_size=3)
vocals = onsets(load("vocals"), delta=0.05, wait_s=0.08, fmin=80, fmax=8000, lag=2, max_size=3)
write_json("onsets.json", {
    "format": "t = attack time in song seconds (backtracked to energy rise, <=23 ms); s = flux strength normalised to the stem's p99.5, clipped 0..1",
    "drums": drums, "vocals": vocals,
})
print("drums", len(drums), "vocals", len(vocals))
