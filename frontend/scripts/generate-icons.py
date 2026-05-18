#!/usr/bin/env python3
import os
from PIL import Image

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
SRC = os.path.join(os.path.dirname(__file__), '..', 'public', 'logo.png')
DST_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')

os.makedirs(DST_DIR, exist_ok=True)

img = Image.open(SRC).convert('RGBA')

for size in SIZES:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    out_path = os.path.join(DST_DIR, f'icon-{size}x{size}.png')
    resized.save(out_path, 'PNG')
    print(f'Generated {out_path}')

print('Done. All icons generated.')
