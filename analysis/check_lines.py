"""QA: line-context view for keywords. Each panel: previous line + keyword line, vocals spectrogram, f0, labelled
word starts (red) / attacks (orange), 16th grid with beat numbers. -> out/check/lines_N.png
usage: python check_lines.py [align.json] [line indices comma-separated (default: all keyword lines)]"""
import sys
import numpy as np
import librosa
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from common import load, read_json, OUT, SR, STEMS

src = sys.argv[1] if len(sys.argv) > 1 else "align.json"
data = read_json(src)
lines = data["lines"] if isinstance(data, dict) else data
fit = read_json("beats_raw.json")["fit"]
t0, P = fit["t0"], fit["period"]
voc = load("vocals")
F0 = np.load(STEMS / "f0.npz")

if len(sys.argv) > 2:
    idx = [int(x) for x in sys.argv[2].split(",")]
else:
    idx = [i for i, l in enumerate(lines) if l["text"].upper() == l["text"] and l["text"] != "world.execute(me);"]

PER = 4
for page in range(0, len(idx), PER):
    chunk = idx[page:page + PER]
    fig, axes = plt.subplots(len(chunk), 1, figsize=(24, 5.2 * len(chunk)), facecolor="black", squeeze=False)
    for ax, i in zip(axes[:, 0], chunk):
        ws = (lines[i - 1]["words"] if i > 0 else []) + lines[i]["words"]
        a = max(ws[0]["start"] - 0.25, lines[i]["words"][0]["start"] - 3.2)
        b = lines[i]["words"][-1]["end"] + 0.45
        seg = voc[int(a * SR):int(b * SR)]
        S = librosa.power_to_db(librosa.feature.melspectrogram(y=seg, sr=SR, n_fft=1024, hop_length=128, n_mels=110, fmax=9000), ref=np.max)
        ax.imshow(S, origin="lower", aspect="auto", extent=[a, b, 0, 110], cmap="magma", vmin=-72, vmax=0)
        i0, i1 = int(a / 0.005), int(b / 0.005)
        tf = np.arange(i0, i1) * 0.005
        fz = np.where(F0["per"][i0:i1] > 0.45, F0["f0"][i0:i1], np.nan)
        ax.plot(tf, 12 * np.log2(fz / 110) * 110 / 36, color="lime", lw=2.2)
        for k in range(int(np.ceil((a - t0) / (P / 4))), int((b - t0) / (P / 4)) + 1):
            x = t0 + k * P / 4
            ax.axvline(x, color="#8af", lw=1.6 if k % 4 == 0 else 0.5, alpha=0.9 if k % 4 == 0 else 0.45)
            if k % 4 == 0:
                ax.text(x, 2, f"b{k // 4}", color="#8af", fontsize=9)
        for w in ws:
            ax.axvline(w["start"], color="red", lw=1.8)
            if "attack" in w:
                ax.axvline(w["attack"], color="orange", ls="--", lw=1)
            ax.text(w["start"] + 0.005, 104, w["text"], color="white", fontsize=12, va="top",
                    bbox=dict(facecolor="black", alpha=0.6, pad=1, lw=0))
        ax.set_xlim(a, b); ax.set_yticks([])
        ax.set_xticks(np.arange(np.ceil(a * 10) / 10, b, 0.1)); ax.tick_params(colors="#bbb", labelsize=8)
        ax.set_title(f"line #{i}: {lines[i]['text']}", color="white", fontsize=14, loc="left")
    fig.tight_layout()
    fig.savefig(OUT / "check" / f"lines_{page // PER + 1}.png", dpi=62, facecolor="black")
    plt.close(fig)
print(len(idx), "lines")
