"""Step 3: beat grid. beat_this (primary) + madmom DBN (cross-check) -> fixed-BPM least-squares grid,
phase corrected by drum onsets -> out/beats_raw.json (consumed by s06_timing.py)."""
import numpy as np
from common import STEMS, write_json, read_json

mix = str(STEMS / "mix.wav")

# --- method A: beat_this ---
from beat_this.inference import File2Beats
f2b = File2Beats(checkpoint_path="final0", device="cuda", dbn=False)
bt_beats, bt_down = f2b(mix)
bt_beats, bt_down = np.asarray(bt_beats), np.asarray(bt_down)

# --- method B: madmom RNN + DBN (beats and downbeats) ---
from madmom.features.beats import RNNBeatProcessor, DBNBeatTrackingProcessor
from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
mm_beats = DBNBeatTrackingProcessor(fps=100, min_bpm=100, max_bpm=160)(RNNBeatProcessor()(mix))
mm_db = DBNDownBeatTrackingProcessor(beats_per_bar=[4], fps=100)(RNNDownBeatProcessor()(mix))
mm_down = mm_db[mm_db[:, 1] == 1, 0]


def fit_grid(beats, iters=6, tol=0.035):
    """Robust fixed-tempo fit: scan period x phase (circular mean), score by soft inlier count,
    then least squares on inliers with indices from the scanned grid. Robust to inserted/missed beats."""
    best = None
    for P in np.arange(0.440, 0.480, 0.00002):
        ph = np.angle(np.exp(2j * np.pi * beats / P).mean()) / (2 * np.pi) * P
        res = (beats - ph + P / 2) % P - P / 2
        score = np.exp(-(res / 0.025) ** 2).sum()
        if best is None or score > best[0]:
            best = (score, P, ph)
    _, P, t0 = best
    t0 = t0 + np.floor((beats[0] - t0) / P + 0.5) * P
    keep = np.ones(len(beats), bool)
    for _ in range(iters):
        k = np.round((beats - t0) / P)
        res = beats - (t0 + k * P)
        keep = np.abs(res) < tol
        A = np.stack([np.ones(keep.sum()), k[keep]], 1)
        (t0, P), *_ = np.linalg.lstsq(A, beats[keep], rcond=None)
    res = beats - (t0 + np.round((beats - t0) / P) * P)
    return t0, P, res, np.abs(res) < tol


def stats(res):
    r = np.abs(res) * 1000
    return {"n": int(len(res)), "mean_ms": round(float(np.mean(res) * 1000), 2),
            "mean_abs_ms": round(float(r.mean()), 2), "median_abs_ms": round(float(np.median(r)), 2),
            "p95_abs_ms": round(float(np.percentile(r, 95)), 2), "max_abs_ms": round(float(r.max()), 2)}


t0, P, resA, keepA = fit_grid(bt_beats)
_, PB, _, _ = fit_grid(mm_beats)

# phase correction: median offset of strong drum onsets that sit within ±45 ms of a grid beat
drums = read_json("onsets.json")["drums"]
dt = np.array([o["t"] for o in drums]); ds = np.array([o["s"] for o in drums])
strong = dt[ds > 0.35]
k = np.round((strong - t0) / P)
off = strong - (t0 + k * P)
near = np.abs(off) < 0.045
near &= True
phase = float(np.median(off[near]))
t0c = t0 + phase


def resid(ts, t0, P):
    return ts - (t0 + np.round((ts - t0) / P) * P)


# downbeat phase: majority vote of beat index mod 4 over beat_this and madmom downbeats
def db_mod(down):
    m = np.round((down - t0c) / P).astype(int) % 4
    return np.bincount(m, minlength=4)

votes_bt, votes_mm = db_mod(bt_down), db_mod(mm_down)
db = int(np.argmax(votes_bt + votes_mm))

write_json("beats_raw.json", {
    "beat_this": {"beats": bt_beats.round(4).tolist(), "downbeats": bt_down.round(4).tolist()},
    "madmom": {"beats": mm_beats.round(4).tolist(), "downbeats": mm_down.round(4).tolist()},
    "fit": {"t0_raw": t0, "period": P, "bpm": 60 / P, "period_madmom": PB, "bpm_madmom": 60 / PB,
            "drum_phase_correction_ms": phase * 1000, "t0": t0c, "downbeat_mod4": db,
            "downbeat_votes_beat_this": votes_bt.tolist(), "downbeat_votes_madmom": votes_mm.tolist()},
    "stats": {
        "beat_this_vs_grid": stats(resid(bt_beats, t0c, P)),
        "madmom_vs_grid": stats(resid(mm_beats, t0c, P)),
        "strong_drum_onsets_vs_grid": stats(resid(strong, t0c, P)[near]),
        "beat_this_vs_madmom": stats(np.array([b - mm_beats[np.argmin(np.abs(mm_beats - b))] for b in bt_beats])),
    },
})
import json; print(json.dumps(read_json("beats_raw.json")["fit"], indent=1)); print(json.dumps(read_json("beats_raw.json")["stats"], indent=1))
