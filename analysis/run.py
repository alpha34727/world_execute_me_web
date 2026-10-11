"""Run the whole analysis pipeline in order. Usage: .venv/Scripts/python.exe run.py [first_step]
Steps: s01_separate s02_onsets s03_beats s04_align s05_refine s06_timing s07_features s08_overview
QA sheets (not part of the pipeline): check_keywords.py, check_lines.py -> out/check/"""
import runpy
import sys
from pathlib import Path

STEPS = ["s01_separate", "s02_onsets", "s03_beats", "s04_align", "s05_refine", "s06_timing", "s07_features", "s08_overview"]
here = Path(__file__).parent
sys.path.insert(0, str(here))
start = STEPS.index(sys.argv[1]) if len(sys.argv) > 1 else 0
for s in STEPS[start:]:
    print(f"== {s}", flush=True)
    runpy.run_path(str(here / f"{s}.py"), run_name="__main__")
