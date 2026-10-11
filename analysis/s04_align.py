"""Step 4: word-level forced alignment of the VTT lyrics against the vocals stem.

Two CTC character aligners: torchaudio WAV2VEC2_ASR_LARGE_LV60K_960H (English, primary; far more robust on
the layered chorus vocals) and MMS_FA (multilingual, fallback). Per phrase group the model with the higher mean
character confidence wins. Lines are grouped into phrases (gap < 1.5 s) and each
group is aligned jointly inside [first.start - 0.6, last.end + 0.6], so slightly-off VTT line times do not
constrain the result. Letter names / foreign count words get phonetic respellings for the aligner only;
the display text is the original lyric. Starts are refined acoustically in s05_refine.py.
-> out/align_raw.json (consumed by s06_timing.py)"""
import re
import numpy as np
import torch
import torchaudio
import torchaudio.functional as AF
from common import load, parse_vtt, read_json, write_json, SR

# display token -> what is actually sung, spelled for a character-level English aligner
SAY = {
    "AC": "ay see", "DC": "dee see", "A.D": "ay dee", "B.C": "bee see", "F": "eff", "M": "em",
    "AM": "ay em", "PM": "pee em", "S": "ess", "TROIS": "trwa", "LIU": "lyoo", "NE": "neh",
    "LO-O-OVE": "loooove", "world.execute(me);": "world execute me",
}


def tokens(text):
    if text == "world.execute(me);":  # title line: three display tokens
        return [(w, s) for w, s in zip(["world.", "execute", "(me);"], SAY[text].split())]
    out = []
    for w in text.split():
        say = SAY.get(w.strip(",.?!"), w)
        say = re.sub(r"[^a-z' ]", "", say.lower().replace("-", " ")).strip()
        out.append((w, say))
    return out


dev = "cuda"


class Aligner:
    def __init__(self, name, bundle, upper):
        self.name, self.upper, self.fs = name, upper, bundle.sample_rate
        if upper:
            self.model = bundle.get_model().to(dev).eval()
            self.dict = {c: i for i, c in enumerate(bundle.get_labels())}
        else:
            self.model = bundle.get_model(with_star=False).to(dev).eval()
            self.dict = bundle.get_dict(star=None)
        self.voc = torch.from_numpy(load("vocals", sr=self.fs))

    def align(self, a, b, parts):
        """parts: list of sung words (lowercase). Returns [(start, end, [char scores])] in song seconds."""
        seg = self.voc[int(a * self.fs):int(b * self.fs)]
        with torch.inference_mode():
            em, _ = self.model(seg[None].to(dev))
            em = torch.log_softmax(em, -1)
        if self.upper:  # word separator '|' between words, aligned but not reported
            chars, owner = [], []
            for wi, p in enumerate(parts):
                if wi: chars.append(self.dict["|"]); owner.append(-1)
                for c in p.upper():
                    chars.append(self.dict[c]); owner.append(wi)
        else:
            chars = [self.dict[c] for p in parts for c in p]
            owner = [wi for wi, p in enumerate(parts) for _ in p]
        ali, sc = AF.forced_align(em, torch.tensor([chars], device=dev), blank=0)
        spans = AF.merge_tokens(ali[0].cpu(), sc[0].exp().cpu())
        r = seg.shape[0] / self.fs / em.shape[1]
        out = [None] * len(parts)
        for sp, wi in zip(spans, owner):
            if wi < 0: continue
            t0, t1 = a + sp.start * r, a + sp.end * r
            if out[wi] is None: out[wi] = [t0, t1, [sp.score]]
            else: out[wi][1] = t1; out[wi][2].append(sp.score)
        return out


ALIGNERS = [Aligner("lv60k", torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H, True),
            Aligner("mms_fa", torchaudio.pipelines.MMS_FA, False)]

lines = parse_vtt()
groups, cur = [], [0]
for i in range(1, len(lines)):
    if lines[i]["start"] - lines[i - 1]["end"] > 1.5 or len(cur) >= 8:
        groups.append(cur); cur = []
    cur.append(i)
groups.append(cur)


result = [None] * len(lines)
for g in groups:
    a = max(0.0, lines[g[0]]["start"] - 0.6)
    b = lines[g[-1]]["end"] + 0.6
    if g[-1] + 1 < len(lines):
        b = min(b, lines[g[-1] + 1]["start"] + 0.1)
    if g[0] > 0:
        a = max(a, lines[g[0] - 1]["end"] - 0.1)
    words = []  # (line index, token index, display, sung part)
    for li in g:
        for ti, (disp, say) in enumerate(tokens(lines[li]["text"])):
            for part in say.split():
                words.append((li, ti, disp, part))
    parts = [p for *_, p in words]
    # CTC frames are 20 ms: align at 4 sub-frame window offsets and average to get ~5 ms resolution
    cands = []
    for al in ALIGNERS:
        runs = [al.align(a + sh, b, parts) for sh in (0.0, 0.005, 0.010, 0.015)]
        avg = [[float(np.median([r[i][0] for r in runs])), float(np.median([r[i][1] for r in runs])),
                [s for r in runs for s in r[i][2]]] for i in range(len(parts))]
        cands.append((al.name, avg))
    model_name, timed = max(cands, key=lambda c: np.mean([s for w in c[1] for s in w[2]]))
    per_tok = {}
    for (li, ti, disp, part), (s0, e0, sc) in zip(words, timed):
        if (li, ti) in per_tok:
            w = per_tok[(li, ti)]; w["end"] = e0; w["_sc"] += sc
        else:
            per_tok[(li, ti)] = {"text": disp, "start": s0, "end": e0, "_sc": sc}
    for li in g:
        ws = [per_tok[key] for key in sorted(per_tok) if key[0] == li]
        for w in ws:
            w["start"] = round(w["start"], 4)
            w["end"] = round(w["end"], 4)
            w["score"] = round(float(np.mean(w.pop("_sc"))), 3)
        result[li] = {"text": lines[li]["text"], "vtt_start": lines[li]["start"], "vtt_end": lines[li]["end"],
                      "model": model_name, "words": ws}

write_json("align_raw.json", result)
for i, r in enumerate(result):
    print(f"{i:3d} {r['model'][:3]} vtt {r['vtt_start']:7.3f}  " + "  ".join(f"{w['text']}@{w['start']:.3f}({w['score']:.2f})" for w in r["words"]))
