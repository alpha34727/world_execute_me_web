"""Shared paths and helpers for the analysis pipeline. Inputs: the mp3 + vtt in the repo root."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
ANA = ROOT / "analysis"
OUT = ANA / "out"
STEMS = ANA / "stems"
MP3 = ROOT / "Mili - world.execute(me);.mp3"
VTT = ROOT / "Mili - world.execute(me);.vtt"
SR = 44100
FPS = 60
HOP = SR // FPS  # 735 samples per feature row
STEM_NAMES = ["drums", "bass", "vocals", "other"]

OUT.mkdir(parents=True, exist_ok=True)
STEMS.mkdir(parents=True, exist_ok=True)


def load(name, mono=True, sr=SR):
    """Load mix.wav or a stem as float32 numpy (mono by default)."""
    import soundfile as sf
    import numpy as np
    y, file_sr = sf.read(STEMS / f"{name}.wav", dtype="float32", always_2d=True)
    assert file_sr == SR, file_sr
    y = y.T
    if mono:
        y = y.mean(axis=0)
    if sr != SR:
        import librosa
        y = librosa.resample(y, orig_sr=SR, target_sr=sr)
    return y


def parse_vtt(path=VTT):
    """Returns [{start, end, text}] from the VTT (line-level only)."""
    ts = r"(\d+):(\d+):(\d+)\.(\d+)"
    def sec(m):
        h, mi, s, ms = m
        return int(h) * 3600 + int(mi) * 60 + int(s) + int(ms) / 1000
    lines, cur = [], None
    for raw in path.read_text(encoding="utf-8").splitlines():
        m = re.match(ts + r"\s+-->\s+" + ts, raw)
        if m:
            g = m.groups()
            cur = {"start": sec(g[:4]), "end": sec(g[4:]), "text": ""}
            lines.append(cur)
        elif cur is not None and raw.strip():
            cur["text"] = (cur["text"] + " " + raw.strip()).strip()
        elif not raw.strip():
            cur = None
    for l in lines:
        l["text"] = l["text"].replace("\u2019", "'")
    return lines


def read_json(name):
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def write_json(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
