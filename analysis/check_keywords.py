"""QA sheet: one panel per capitalised keyword — vocals log-mel around the word start with aligner/onset/grid
markers -> out/check/keywords_N.png. Used for the manual keyword verification (not a pipeline product)."""
import sys, json
import numpy as np
import librosa
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from common import load, read_json, OUT, SR, STEMS

src = sys.argv[1] if len(sys.argv) > 1 else "align.json"
lines = read_json(src)
lines = lines["lines"] if isinstance(lines, dict) else lines
fit = read_json("beats_raw.json")["fit"]
t0, P = fit["t0"], fit["period"]
vo = read_json("onsets.json")["vocals"]
voc = load("vocals")
F0 = np.load(STEMS / "f0.npz"); NOV = np.load(STEMS / "novelty.npz")
(OUT / "check").mkdir(exist_ok=True)

KEY = []
for i, l in enumerate(lines):
    txt = l["text"]
    if txt.upper() == txt and any(c.isalpha() for c in txt) and txt != "world.execute(me);":
        for w in l["words"]:
            KEY.append((i, w))

PER = 8
for page in range(0, len(KEY), PER):
    chunk = KEY[page:page + PER]
    fig, axes = plt.subplots(4, 2, figsize=(22, 15), facecolor="black")
    for ax, (i, w) in zip(axes.flat, chunk):
        st = w["start"]; a, b = st - 0.40, st + 0.55
        seg = voc[int(a * SR):int(b * SR)]
        S = librosa.power_to_db(librosa.feature.melspectrogram(y=seg, sr=SR, n_fft=1024, hop_length=128, n_mels=96, fmax=10000), ref=np.max)
        ax.imshow(S, origin="lower", aspect="auto", extent=[a, b, 0, 96], cmap="magma", vmin=-70, vmax=0)
        rms = librosa.feature.rms(y=seg, frame_length=512, hop_length=128)[0]
        tt = a + np.arange(len(rms)) * 128 / SR
        ax.plot(tt, 96 * rms / (rms.max() + 1e-9) * 0.9, color="white", lw=0.8, alpha=0.6)
        i0, i1 = int(a / 0.005), int(b / 0.005)
        tf = np.arange(i0, i1) * 0.005
        fz = np.where(F0["per"][i0:i1] > 0.45, F0["f0"][i0:i1], np.nan)
        semi = 12 * np.log2(fz / 110)  # 0..36 semitones above A2 -> map to 0..96
        ax.plot(tf, semi * 96 / 36, color="lime", lw=2)
        ax.plot(tf, NOV["nov"][i0:i1] * 40, color="deepskyblue", lw=1.2); ax.plot(tf, NOV["cons"][i0:i1] * 25, color="orange", lw=0.8)
        if "attack" in w: ax.axvline(w["attack"], color="orange", ls="--", lw=1.5)
        k0 = int(np.ceil((a - t0) / (P / 4))); k1 = int(np.floor((b - t0) / (P / 4)))
        for k in range(k0, k1 + 1):
            x = t0 + k * P / 4
            ax.axvline(x, color="#88a", lw=1.4 if k % 4 == 0 else 0.5, alpha=0.8 if k % 4 == 0 else 0.4)
        for o in vo:
            if a <= o["t"] <= b:
                ax.plot([o["t"]], [92], marker="v", color="yellow", ms=4 + 8 * o["s"])
        ax.axvline(w.get("start_ctc", st), color="cyan", ls="--", lw=1.5)
        ax.set_xticks(np.arange(np.ceil(a * 20) / 20, b, 0.05))
        ax.axvline(st, color="red", lw=2)
        ax.axvline(lines[i]["vtt"][0] if "vtt" in lines[i] else lines[i]["vtt_start"], color="#bbb", ls=":", lw=1.5)
        g16 = t0 + round((st - t0) / (P / 4)) * P / 4
        ax.set_title(f"#{i} {w['text']}  {st:.3f}  ctc{1000*(w.get('start_ctc', st)-st):+.0f}  g16{1000*(st-g16):+.0f}ms  s={w.get('score', 0):.2f}",
                     color="white", fontsize=13)
        ax.set_xlim(a, b); ax.set_yticks([]); ax.tick_params(colors="#999", labelsize=7)
    for ax in list(axes.flat)[len(chunk):]:
        ax.axis("off")
    fig.suptitle("red=final  cyan--=CTC  grey:=VTT  ▼=vocal onsets  lines=beats(thick)/16ths  white=RMS  green=f0  blue=note-novelty  orange=consonant(attack)", color="white")
    fig.tight_layout()
    fig.savefig(OUT / "check" / f"keywords_{page // PER + 1}.png", dpi=80, facecolor="black")
    plt.close(fig)
print(len(KEY), "keyword words")
