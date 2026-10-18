"""Step 6: assemble out/timing.json — fixed-BPM grid, sections, word-level lyrics, notes.
Inputs: out/beats_raw.json, out/align.json, keywords_verified.json (manual keyword check), sections below."""
import json
import numpy as np
import soundfile as sf
from common import ANA, STEMS, read_json, write_json, SR, FPS

PREROLL, TOTAL_FRAMES = 5, 13255  # +4 s of silence after the song (phase 4, user: the end credits need time to read)
SONG_FRAMES = TOTAL_FRAMES - PREROLL * FPS
FILM_SONG_END = SONG_FRAMES / FPS

raw = read_json("beats_raw.json")
fit, stats = raw["fit"], raw["stats"]
t0, P = fit["t0"], fit["period"]
assert fit["downbeat_mod4"] == 0, "beat 0 must be a downbeat"

# --- grid: beat k at t0 + k*P (k may be negative before the first downbeat); bar b = beat 4b ---
kmax = int(np.floor((FILM_SONG_END - t0) / P))
beats = [round(t0 + k * P, 5) for k in range(0, kmax + 1)]
bars = beats[::4]

# --- music extent ---
mix, _ = sf.read(STEMS / "mix.wav", dtype="float32", always_2d=True)
peak = np.abs(mix).max(1)
loud = np.where(peak > 10 ** (-60 / 20))[0]
music_start, music_end = loud[0] / SR, loud[-1] / SR
duration = len(peak) / SR

# --- sections on bar lines (bar indices), decided from lyrics + per-bar stem energy (see notes) ---
SECTIONS = [
    ("intro", 0, 8, "PROTECTION -> SIMULATION: the program boots - power line, object creation, initialization, sung over drums+bass with no pad."),
    ("inst1", 8, 16, "Title drop 'world.execute(me);' (not sung - vocals silent); the full synth layer enters, instrumental."),
    ("v1", 16, 24, "Verse 1 - geometry lessons: points/DIMENSION, circle/CIRCUMFERENCE, sine/TANGENTS, infinity/LIMITATIONS."),
    ("pre1", 24, 32, "Pre-chorus 1 - AC to DC, so dizzy, A.D to B.C, unite so deeply; bass more active."),
    ("c1", 32, 40, "Chorus 1 (+1.5 dB) - STIMULATIONS, SATISFACTION, EXECUTION, trapped in SIMULATION."),
    ("v2", 40, 48, "Verse 2 - eggplant/NUTRIENTS, tomato/ANTIOXIDANTS, tabby cat/ENJOYMENT, god/EXISTENCE; drum drop at bar 40."),
    ("pre2", 48, 56, "Pre-chorus 2 - F to M, AM to PM, S to M, the trance; drums thin out (drops at bars 50 and 55)."),
    ("c2", 56, 60, "Chorus 2 first half - VIBRATIONS, COMPLETION."),
    ("c2x", 60, 64, "4-bar extension inserted into chorus 2 - 'you have left' x6 -> ISOLATION; bass and vocals pull back."),
    ("bridge", 64, 72, "Chorus 2 resumes but the program breaks - FRAGMENTS, DISHEARTENED, 'challenging your god', ILLEGAL ARGUMENTS."),
    ("inst2", 72, 80, "Instrumental after the crash - no vocals, full band."),
    ("chant", 80, 88, "EXECUTION x12 (one every 2 beats, some syncopated by a 16th) + EIN DOS TROIS NE FEM LIU (one per beat) + EXECUTION."),
    ("c3", 88, 96, "Chorus 3 (+1.5 dB) - every keyword is now EXECUTION; 'if I can have you back', 'we are trapped ah'."),
    ("love", 96, 104, "LO-O-OVE x4 - studied how to properly love, algebraic expression of love, 'though you are free, I am trapped'."),
    ("outro", 104, 112, "Outro - vocals and pad drop out, drums+bass groove; final EXECUTION at bar 111."),
    ("end", 112, None, "Final EXECUTION rings out and decays (below -60 dBFS at ~207.8 s, digital silence from ~209.0 s) to the end of the film."),
]
sections = []
for sid, b0, b1, note in SECTIONS:
    s = 0.0 if b0 == 0 else round(t0 + 4 * b0 * P, 5)
    e = round(t0 + 4 * b1 * P, 5) if b1 is not None else round(FILM_SONG_END, 5)
    sections.append({"id": sid, "start": s, "end": e, "bar_start": b0, "bar_end": b1, "note": note})


def section_at(t):
    for s in sections:
        if s["start"] <= t < s["end"]:
            return s["id"]
    return sections[-1]["id"]


# --- lyrics: apply verified keyword overrides ---
lines = read_json("align.json")
ver = json.loads((ANA / "keywords_verified.json").read_text(encoding="utf-8"))
auto_err = []
for e in ver["entries"]:
    w = next(w for w in lines[e["line"]]["words"] if w["text"] == e["word"])
    auto_err.append((e["line"], e["word"], round(w["start"] - e["start"], 4)))
    w["start"], w["verified"] = e["start"], True
    w["src"] = "verified" if e["verdict"] == "ok" else "corrected"
    if "attack" in e:
        w["attack"] = e["attack"]
    elif w.get("attack", -1) >= w["start"] - 0.02:
        w.pop("attack", None)
big = [x for x in auto_err if abs(x[2]) > 0.12]
for li, wd, d in big:
    print(f"warning: automatic start of line {li} {wd} is {d * 1000:+.0f} ms from the verified time")
ae = np.abs([x[2] for x in auto_err]) * 1000
auto_vs_verified = {"n": len(ae), "median_abs_ms": round(float(np.median(ae)), 1),
                    "p90_abs_ms": round(float(np.percentile(ae, 90)), 1), "max_abs_ms": round(float(ae.max()), 1),
                    "over_120ms": [f"#{li} {wd} {d * 1000:+.0f}ms" for li, wd, d in big]}

out_lines = []
S16 = P / 4
for i, l in enumerate(lines):
    words = l["words"]
    sung = l["text"] != "world.execute(me);"
    if not sung:
        # title drop: not sung - show the three tokens on the first three beats of inst1 (bar 8 = beat 32)
        for j, w in enumerate(words):
            w.update(start=round(t0 + (32 + j) * P, 5), end=round(t0 + (33 + j) * P, 5), src="title")
            w.pop("attack", None)
        words[-1]["end"] = round(t0 + 40 * P, 5)
    for a, b in zip(words, words[1:]):
        if b["start"] <= a["start"]:
            raise SystemExit(f"line {i}: non-monotonic words {a['text']}@{a['start']} {b['text']}@{b['start']}")
        a["end"] = round(min(a["end"], b.get("attack", b["start"])), 4)
        a["end"] = max(a["end"], round(a["start"] + 0.03, 4))
    ow = []
    for w in words:
        d = {"text": w["text"], "start": round(w["start"], 4), "end": round(w["end"], 4)}
        if "attack" in w and w["attack"] < w["start"]:
            d["attack"] = round(w["attack"], 4)
        d["g16"] = int(round((w["start"] - t0) / S16))  # nearest 16th-note index (beat = g16/4)
        d["src"] = w.get("src", "ctc")
        if w.get("verified"):
            d["verified"] = True
        ow.append(d)
    start = ow[0].get("attack", ow[0]["start"])
    kw = sung and l["text"].upper() == l["text"] and any(c.isalpha() for c in l["text"])
    out_lines.append({"i": i, "text": l["text"], "start": round(start, 4), "end": ow[-1]["end"],
                      # vocal pickups (<= 0.5 s before a downbeat) belong to the next section
                      "section": section_at(ow[0]["start"] + 0.5), "sung": sung, "keyword": kw,
                      "vtt": [l["vtt_start"], l["vtt_end"]], "words": ow})

for a, b in zip(out_lines, out_lines[1:]):
    if b["words"][0]["start"] <= a["words"][-1]["start"]:
        raise SystemExit(f"lines {a['i']} / {b['i']} overlap")

src_count = {}
for l in out_lines:
    for w in l["words"]:
        src_count[w["src"]] = src_count.get(w["src"], 0) + 1
n_ok = sum(e["verdict"] == "ok" for e in ver["entries"])
n_fix = sum(e["verdict"] == "corrected" for e in ver["entries"])

timing = {
    "version": 1,
    "audio": {"file": "Mili - world.execute(me);.mp3", "duration": round(duration, 4), "sample_rate": SR,
              "music_start": round(music_start, 4), "music_end": round(music_end, 4)},
    "film": {"fps": FPS, "preroll": PREROLL, "total_frames": TOTAL_FRAMES, "song_frames": SONG_FRAMES,
             "song_end": round(FILM_SONG_END, 5)},
    "grid": {"bpm": round(fit["bpm"], 5), "period": P, "t0": t0, "beats_per_bar": 4,
             "note": "beat k at t0 + k*period (k may be negative); bar b starts at beat 4b; beat 0 is the first downbeat",
             "beat_count": len(beats), "bar_count": len(bars)},
    "beats": beats,
    "bars": bars,
    "sections": sections,
    "lines": out_lines,
    "notes": {
        "beats": (
            f"Fixed grid {fit['bpm']:.4f} BPM fitted by robust least squares (period x phase scan, then LSQ on inliers) "
            f"to beat_this 'final0' beats; madmom RNN+DBN independently gives {fit['bpm_madmom']:.4f} BPM. "
            f"Phase corrected by the median offset of strong drum-stem onsets ({fit['drum_phase_correction_ms']:+.2f} ms). "
            f"Downbeat = beat index = 0 mod 4 (votes beat_this {fit['downbeat_votes_beat_this']}, madmom {fit['downbeat_votes_madmom']}). "
            "No tempo drift: per-15 s median residuals of drum onsets stay within +-10 ms over the whole song."),
        "beat_error_stats_ms": stats,
        "keyword_auto_vs_verified": auto_vs_verified,
        "beat_error_note": "max errors (~220 ms) are tracker artefacts at 89.3-90.7 s where beat_this inserts two half-beats and drops one; the robust grid is unaffected. beat_this output is quantised to 20 ms, madmom to 10 ms.",
        "sections": "Boundaries on bar lines from lyric lines + per-bar stem RMS. Musically bars 56-72 are one extended chorus; it is split by narrative: c2 (56-60), c2x (60-64, the inserted 'you have left' extension), bridge (64-72, the program breaks). Vocal pickups (up to 0.5 s) before their section's downbeat.",
        "lyrics": (
            "VTT has line times only. Word times: CTC forced alignment on the demucs vocals stem with torchaudio "
            "WAV2VEC2_ASR_LARGE_LV60K_960H (MMS_FA as fallback, best mean confidence per phrase group), 4 sub-frame window "
            "offsets averaged; then refined to the sung NOTE onset using torchcrepe f0 steps, voicing onset and voiced-band "
            "energy rise (s05_refine.py). word.start = first sung note onset (vowel / pitch), word.attack = audible leading "
            f"consonant. All capitalised keywords were checked by hand against the audio (keywords_verified.json): {n_ok} confirmed, "
            f"{n_fix} corrected; the verified times are used. Automatic-vs-verified distance on keywords is in keyword_auto_vs_verified. "
            f"Word sources: {src_count}. Non-keyword words are automatic (typical error +-40 ms)."),
        "title_line": "'world.execute(me);' is not sung (vocals stem silent after 15.0 s); its tokens are placed on beats 32-34 (the inst1 drop) and marked sung:false.",
        "song_length": f"mp3 decodes to {duration:.3f} s; music ends at {music_end:.3f} s (last sample > -60 dBFS), followed by digital silence. The film uses {SONG_FRAMES} song frames = {FILM_SONG_END:.4f} s" + (
            f", {FILM_SONG_END - duration:.3f} s past the end of the mp3 (a silent tail for the end credits; the render pads the audio with silence)." if FILM_SONG_END > duration else ", so trimming removes only silence."),
    },
}
write_json("timing.json", timing)
print(f"beats={len(beats)} bars={len(bars)} sections={len(sections)} lines={len(out_lines)} "
      f"words={sum(len(l['words']) for l in out_lines)} src={src_count}")
for s in sections:
    print(f"  {s['id']:7s} {s['start']:8.3f} - {s['end']:8.3f}  bars {s['bar_start']}-{s['bar_end']}")
