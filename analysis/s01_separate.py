"""Step 1: decode the mp3 and separate drums / bass / vocals / other with demucs (htdemucs_ft)."""
import os
import random
import subprocess
os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
import numpy as np
import soundfile as sf
import torch
from demucs.pretrained import get_model
from demucs.apply import apply_model
from common import MP3, STEMS, SR

mix_path = STEMS / "mix.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(MP3), "-ac", "2", "-ar", str(SR),
                "-c:a", "pcm_f32le", str(mix_path)], check=True)
mix, sr = sf.read(mix_path, dtype="float32", always_2d=True)
assert sr == SR

random.seed(0)  # demucs picks random shift offsets: seed for reproducible stems
torch.manual_seed(0)
torch.use_deterministic_algorithms(True)  # bit-identical stems across runs
torch.backends.cudnn.benchmark = False
model = get_model("htdemucs_ft")
model.eval()
dev = "cuda" if torch.cuda.is_available() else "cpu"
wav = torch.from_numpy(mix.T.copy())
ref = wav.mean(0)
wav = (wav - ref.mean()) / ref.std()
with torch.no_grad():
    sources = apply_model(model, wav[None], device=dev, shifts=2, split=True, overlap=0.25, progress=False)[0]
sources = sources * ref.std() + ref.mean()
for name, src in zip(model.sources, sources):
    sf.write(STEMS / f"{name}.wav", src.cpu().numpy().T, SR, subtype="FLOAT")
    print(name, float(np.sqrt((src.cpu().numpy() ** 2).mean())))
