"""Cut cells out of a stills contact sheet: python tools/cells.py <sheet.png> <cellW> <cellH> [out_dir]
Writes <out_dir>/r<row>c<col>.png (row = shot, col = start/mid/end) and a half-size overview."""
import sys, os
from PIL import Image
sheet, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
out = sys.argv[4] if len(sys.argv) > 4 else 'renders/check/cells'
os.makedirs(out, exist_ok=True)
im = Image.open(sheet)
label_w, pad, head = 300, 10, 56
rows = (im.height - head - pad) // (h + pad + 22)
for r in range(rows):
    for c in range(3):
        x, y = label_w + c * (w + pad), head + r * (h + pad + 22)
        if x + w <= im.width: im.crop((x, y, x + w, y + h)).save(f'{out}/r{r}c{c}.png')
im.resize((im.width // 3, im.height // 3), Image.LANCZOS).save(f'{out}/sheet_small.png')
print(rows, 'rows ->', out)
