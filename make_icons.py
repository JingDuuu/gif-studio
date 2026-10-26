import os
import numpy as np
from PIL import Image, ImageDraw

S = 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT, exist_ok=True)

# --- diagonal gradient background ---
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
t = (xx + yy) / (2.0 * (S - 1))
c1 = np.array([10, 132, 255], np.float32)   # 0A84FF
c2 = np.array([94, 92, 230], np.float32)    # 5E5CE6
arr = np.zeros((S, S, 3), np.float32)
for i in range(3):
    arr[..., i] = c1[i] + (c2[i] - c1[i]) * t

img = np.empty((S, S, 4), np.uint8)
img[..., 0] = arr[..., 0].clip(0, 255).astype(np.uint8)
img[..., 1] = arr[..., 1].clip(0, 255).astype(np.uint8)
img[..., 2] = arr[..., 2].clip(0, 255).astype(np.uint8)
img[..., 3] = 255

im = Image.fromarray(img, "RGBA")

# --- rounded-square alpha mask ---
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.225), fill=255)
im.putalpha(mask)

draw = ImageDraw.Draw(im)

# --- play triangle (white) ---
cx, cy = S * 0.535, S * 0.5
hw, hh = S * 0.17, S * 0.19
draw.polygon([(cx - hw, cy - hh), (cx - hw, cy + hh), (cx + hw * 1.15, cy)], fill=(255, 255, 255, 255))

# --- sparkle (4-point star) top-right ---
scx, scy, r = S * 0.72, S * 0.28, S * 0.09
k = 0.24
draw.polygon([
    (scx, scy - r), (scx + r * k, scy - r * k), (scx + r, scy),
    (scx + r * k, scy + r * k), (scx, scy + r), (scx - r * k, scy + r * k),
    (scx - r, scy), (scx - r * k, scy - r * k),
], fill=(255, 255, 255, 255))

# --- save sizes ---
sizes = {
    "icon-1024.png": 1024,
    "icon-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
    "icon-32.png": 32,
    "icon-16.png": 16,
}
for name, sz in sizes.items():
    im.resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, name), "PNG")

# --- favicon.ico (16/32/48) ---
ico = im.resize((48, 48), Image.LANCZOS)
ico.save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

print("icons written to", OUT)
for name in sorted(sizes):
    print("  ", name)
print("   favicon.ico")
