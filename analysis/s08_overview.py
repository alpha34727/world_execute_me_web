"""Step 8: overview chart -> out/overview.png
Waveform (mix grey, vocals cyan) + beat grid (bar numbers) + sections + drum onsets + word-level lyrics
(keywords highlighted, ✓ = hand-verified). One strip per 16 bars."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from common import load, read_json, OUT, SR

T = read_json("timing.json")
ons = read_json("onsets.json")
mix, voc = load("mix"), load("vocals")
P, t0 = T["grid"]["period"], T["grid"]["t0"]
BARS_PER_STRIP = 16
end_t = T["film"]["song_end"]
n_strips = int(np.ceil((end_t - 0) / (BARS_PER_STRIP * 4 * P)))

SEC_COL = {"intro": "#2b6f8a", "inst1": "#555", "v1": "#2f7d4f", "pre1": "#6b6b2a", "c1": "#a0522d",
           "v2": "#2f7d4f", "pre2": "#6b6b2a", "c2": "#a0522d", "c2x": "#7a3b7a", "bridge": "#b22222",
           "inst2": "#555", "chant": "#c0392b", "c3": "#a0522d", "love": "#c2185b", "outro": "#2b6f8a", "end": "#333"}

W_IN, H_STRIP = 40, 4.6
fig = plt.figure(figsize=(W_IN, H_STRIP * n_strips + 1.2), facecolor="#0b0d10")
fig.text(0.006, 1 - 0.25 / (H_STRIP * n_strips + 1.2), (
    f"world.execute (me) ;  —  {T['grid']['bpm']:.3f} BPM fixed grid · beat 0 = {t0:.4f} s · "
    f"{len(T['sections'])} sections · {len(T['lines'])} lines · {sum(len(l['words']) for l in T['lines'])} words · "
    f"song frames {T['film']['song_frames']} ({end_t:.3f} s) · music ends {T['audio']['music_end']:.2f} s"),
    color="white", fontsize=20, va="top", family="monospace")
fig.text(0.006, 1 - 0.6 / (H_STRIP * n_strips + 1.2),
         "grey = mix waveform   cyan = vocals stem   orange ticks = drum onsets   thin lines = beats, thick = bars (number)   "
         "red = keyword (✓ hand-verified)   white = lyric word at its start   pale = attack (leading consonant)",
         color="#aab", fontsize=13, va="top", family="monospace")


def env(y, a, b, n):
    seg = y[int(max(a, 0) * SR):int(b * SR)]
    if len(seg) < n:
        return np.zeros(n), np.zeros(n)
    seg = seg[:len(seg) // n * n].reshape(n, -1)
    return seg.min(1), seg.max(1)


for s in range(n_strips):
    a = t0 + s * BARS_PER_STRIP * 4 * P if s else 0.0
    full_b = t0 + (s + 1) * BARS_PER_STRIP * 4 * P
    b = min(full_b, end_t)
    frac = (b - a) / (full_b - a)  # last strip is drawn narrower at the same time scale
    top = 1 - (1.2 + s * H_STRIP) / (H_STRIP * n_strips + 1.2)
    h = H_STRIP / (H_STRIP * n_strips + 1.2)
    ax = fig.add_axes([0.012, top - h + 0.08 * h, 0.982 * frac, h * 0.86], facecolor="#0b0d10")
    ax.set_xlim(a, b); ax.set_ylim(-1.0, 2.25)
    ax.set_yticks([]); ax.tick_params(colors="#889", labelsize=11)
    for sp in ax.spines.values():
        sp.set_color("#333")
    # sections band
    for sec in T["sections"]:
        if sec["end"] <= a + 1e-3 or sec["start"] >= b - 1e-3:
            continue
        x0, x1 = max(sec["start"], a), min(sec["end"], b)
        ax.add_patch(Rectangle((x0, 1.98), x1 - x0, 0.25, color=SEC_COL[sec["id"]], alpha=0.9, lw=0))
        ax.text(x0 + 0.05, 2.105, f"{sec['id']}  [{sec['start']:.2f}]", color="white", fontsize=14, va="center",
                weight="bold", family="monospace", clip_on=True)
    # waveform
    n = 2400
    xs = np.linspace(a, b, n)
    lo, hi = env(mix, a, b, n)
    ax.fill_between(xs, lo * 0.9 - 0.45, hi * 0.9 - 0.45, color="#5a6068", lw=0)
    lo, hi = env(voc, a, b, n)
    ax.fill_between(xs, lo * 0.9 - 0.45, hi * 0.9 - 0.45, color="#3fd4ff", alpha=0.55, lw=0)
    # beat grid
    k0, k1 = int(np.ceil((a - t0) / P)), int(np.floor((b - t0) / P))
    for k in range(k0, k1 + 1):
        x = t0 + k * P
        bar = k % 4 == 0
        ax.axvline(x, color="#7f8fb0" if bar else "#3a4050", lw=1.6 if bar else 0.7, zorder=0)
        if bar:
            ax.text(x + 0.03, -0.97, f"{k // 4}", color="#9fb0d0", fontsize=11, family="monospace")
    # drum onsets
    for o in ons["drums"]:
        if a <= o["t"] <= b:
            ax.plot([o["t"], o["t"]], [-0.95, -0.95 + 0.12 + 0.18 * o["s"]], color="#ff9a3c", lw=1.0)
    # words (staggered on 4 rows)
    lvl = 0
    last_x = [-1e9] * 4
    for l in T["lines"]:
        for w in l["words"]:
            if not (a <= w["start"] <= b):
                continue
            x = w["start"]
            kw = l["keyword"]
            label = w["text"] + (" ✓" if w.get("verified") else "")
            width = (len(label) * 0.115 + 0.12) * (1.25 if kw else 1.0)
            for cand in range(4):
                if x - last_x[cand] > 0:
                    lvl = cand
                    break
            else:
                lvl = int(np.argmin(last_x))
            y = 1.82 - lvl * 0.26
            col = "#ff4d5e" if kw else ("#e8e8e8" if l["sung"] else "#9ad")
            ax.plot([x, x], [0.55, y - 0.02], color=col, lw=1.3 if kw else 0.7, alpha=0.85)
            if "attack" in w:
                ax.plot([w["attack"], w["attack"]], [0.55, 0.75], color=col, lw=0.8, alpha=0.4)
            ax.text(x + 0.01, y, label, color=col, fontsize=14 if kw else 11, weight="bold" if kw else "normal",
                    va="bottom", family="DejaVu Sans", clip_on=True)
            last_x[lvl] = x + width
    ax.set_xticks(np.arange(np.ceil(a), b, 1.0))

fig.savefig(OUT / "overview.png", dpi=100, facecolor=fig.get_facecolor())
print("overview.png", fig.get_size_inches() * 100)
