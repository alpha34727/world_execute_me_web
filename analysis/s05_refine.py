"""Step 5: refine CTC word starts to the sung note onset.

Convention: word.start = onset of the word's first sung NOTE (vowel / pitch onset — the musical hit, which is
what sits on the grid); word.attack = onset of a leading consonant when it is audibly earlier (<=160 ms).
Note-onset novelty on the vocals stem at 5 ms: pitch step (torchcrepe f0, viterbi), voicing onset, rise of
voiced-band (100-1200 Hz) energy. For each word pick the peak in [ctc-110 ms, ctc+60 ms] weighted by a Gaussian
around CTC and a mild 16th-grid preference (the melody is quantised). Monotonic (>= prev + 60 ms).
Keyword starts are then cross-checked by hand (keywords_verified.json, applied in s06_timing.py).
-> out/align.json"""
import numpy as np
import librosa
from scipy.ndimage import uniform_filter1d, maximum_filter1d
from common import load, read_json, write_json, STEMS

FS, HOP = 16000, 80
DT = HOP / FS
y = load("vocals", sr=FS)
M = librosa.feature.melspectrogram(y=y, sr=FS, n_fft=1024, hop_length=HOP, n_mels=80, fmin=60, fmax=7600)
mf = librosa.mel_frequencies(n_mels=80, fmin=60, fmax=7600)
# vocal f0: torchcrepe 'full', viterbi decoding, 5 ms hop (cached in stems/f0.npz for the QA sheets)
import torch
import torchcrepe
np.random.seed(0)  # torchcrepe dithers f0 with scipy.stats (numpy global RNG): seed for reproducibility
torch.manual_seed(0)
with torch.inference_mode():
    f0_t, per_t = torchcrepe.predict(torch.from_numpy(y)[None].cuda(), FS, hop_length=HOP, fmin=70, fmax=1100,
                                     model="full", batch_size=2048, device="cuda", return_periodicity=True,
                                     decoder=torchcrepe.decode.viterbi)
np.savez(STEMS / "f0.npz", f0=f0_t[0].cpu().numpy(), per=per_t[0].cpu().numpy(), hop=DT)
f = np.load(STEMS / "f0.npz")
n = min(M.shape[1], len(f["f0"]))
M, f0, per = M[:, :n], f["f0"][:n], f["per"][:n]

voiced = per > 0.45
semi = 12 * np.log2(np.maximum(f0, 1) / 440)
dsemi = np.zeros(n)
dsemi[4:] = np.abs(semi[4:] - semi[:-4])  # 20 ms span
pitch = np.where(voiced & np.roll(voiced, 4), np.clip((dsemi - 0.25) / 0.75, 0, 1), 0)
von = np.zeros(n)
von[2:] = np.clip(per[2:] - per[:-2], 0, None) * 3
vb = 10 * np.log10(M[(mf > 100) & (mf < 1200)].sum(0) + 1e-8)
vb = uniform_filter1d(vb, 3)
vrise = np.zeros(n)
vrise[3:] = np.clip(vb[3:] - vb[:-3], 0, None)
hb = 10 * np.log10(M[mf > 2500].sum(0) + 1e-8)
hb = uniform_filter1d(hb, 3)
hrise = np.zeros(n)
hrise[3:] = np.clip(hb[3:] - hb[:-3], 0, None)


def norm(x):
    return x / (np.percentile(x, 99.5) + 1e-9)


note = np.clip(0.45 * norm(pitch) + 0.2 * norm(von) + 0.35 * norm(vrise), 0, 1.5)
cons = np.clip(norm(hrise), 0, 1.5)
pk_note = (note == maximum_filter1d(note, 7)) & (note > 0.10)
pk_cons = (cons == maximum_filter1d(cons, 7)) & (cons > 0.25)

fit = read_json("beats_raw.json")["fit"]
t0, P = fit["t0"], fit["period"]
S16 = P / 4

lines = read_json("align_raw.json")
prev = -1.0
for li, l in enumerate(lines):
    for w in l["words"]:
        c = w["start"]
        lo, hi = max(c - 0.11, prev + 0.06), c + 0.06
        best, bt = 0.0, None
        for i in range(int(lo / DT), min(int(hi / DT) + 1, n)):
            if not pk_note[i]:
                continue
            t = i * DT
            d16 = (t - t0 + S16 / 2) % S16 - S16 / 2
            score = note[i] * np.exp(-0.5 * ((t - c) / 0.07) ** 2) * (1 + 0.5 * np.exp(-0.5 * (d16 / 0.025) ** 2))
            if score > best:
                best, bt = score, t
        w["start_ctc"] = c
        if bt is not None and best > 0.08:
            w["start"], w["src"] = round(bt, 4), "note"
        else:
            w["start"], w["src"] = round(max(c, prev + 0.06), 4), "ctc"
        w["conf"] = round(float(best), 3)
        # leading consonant: strongest high-band rise in the 160 ms before the note onset
        s = w["start"]
        ii = [i for i in range(max(int((s - 0.16) / DT), int((prev + 0.03) / DT)), int((s - 0.02) / DT)) if 0 <= i < n and pk_cons[i]]
        if ii:
            ia = max(ii, key=lambda i: cons[i])
            w["attack"] = round(ia * DT, 4)
        prev = w["start"]
    for a, b in zip(l["words"], l["words"][1:]):
        a["end"] = round(min(max(a["end"], a["start"] + 0.05), b.get("attack", b["start"])), 4)
    l["words"][-1]["end"] = round(max(l["words"][-1]["end"], l["words"][-1]["start"] + 0.08), 4)

write_json("align.json", lines)
np.savez(STEMS / "novelty.npz", nov=note, cons=cons, dt=DT)
d = np.array([w["start"] - w["start_ctc"] for l in lines for w in l["words"]]) * 1000
src = [w["src"] for l in lines for w in l["words"]]
print(f"words={len(d)} note-refined={src.count('note')} ctc-fallback={src.count('ctc')} "
      f"shift ms: median {np.median(d):+.1f}, p5 {np.percentile(d, 5):+.1f}, p95 {np.percentile(d, 95):+.1f}")
