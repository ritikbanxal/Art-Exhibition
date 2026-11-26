"""
Prepare the curator's gallery folders for the website.

    python scripts/prepare_gallery.py

Reads (not committed — see .gitignore):
  2025-2026 gallery/   images 1–25 (jpg/webp/png/tif) + Videos/*.mp4|.mov
  2024-2025/Gallery 2026 10 images.pdf   (one artwork per page)

Writes web-ready copies to public/uploads/2025 and public/uploads/2024:
  images  -> JPG, max 1800 px on the longest side
  videos  -> H.264 MP4 (plays in every browser) + a cover image
"""
import json
import pathlib
import re
import subprocess
import sys

from PIL import Image, ImageOps
import imageio_ffmpeg
import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_2025 = ROOT / "2025-2026 gallery"
SRC_2024 = ROOT / "2024-2025" / "Gallery 2026 10 images.pdf"
OUT_2025 = ROOT / "public" / "uploads" / "2025"
OUT_2024 = ROOT / "public" / "uploads" / "2024"
MAX = 1800
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
Image.MAX_IMAGE_PIXELS = None  # some microscopy files are very large


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def save_jpg(img, dest):
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        # 16-bit microscopy TIFFs: scale down to 8-bit before converting
        if img.mode.startswith("I;16") or img.mode == "I":
            img = img.point(lambda v: v / 256).convert("L")
        img = img.convert("RGB")
    img.thumbnail((MAX, MAX), Image.LANCZOS)
    img.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
    return img.size


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


manifest = {"2025": {}, "2024": {}}

# ---------- 2025–2026: images ----------
OUT_2025.mkdir(parents=True, exist_ok=True)
for f in sorted(SRC_2025.iterdir()):
    m = re.match(r"(\d+)\s+(.+)\.(jpg|jpeg|png|webp|tif|tiff)$", f.name, re.I)
    if not m:
        continue
    num, name = int(m.group(1)), m.group(2)
    dest = OUT_2025 / f"{num:02d}-{slug(name)}.jpg"
    with Image.open(f) as im:
        size = save_jpg(im, dest)
    manifest["2025"][num] = {"name": name, "type": "image", "image": f"/uploads/2025/{dest.name}", "size": size}
    print(f"image {num:2d} {name:22s} -> {dest.name} {size} {dest.stat().st_size // 1024} KB")

# ---------- 2025–2026: videos ----------
for f in sorted((SRC_2025 / "Videos").iterdir()):
    m = re.match(r"(\d+)\s+(.+)\.(mp4|mov|m4v)$", f.name, re.I)
    if not m:
        continue
    num, name = int(m.group(1)), m.group(2)
    base = f"{num:02d}-{slug(name)}"
    mp4, poster = OUT_2025 / f"{base}.mp4", OUT_2025 / f"{base}.jpg"
    run([FFMPEG, "-y", "-i", str(f), "-vf", "scale='min(1600,iw)':-2,format=yuv420p",
         "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-movflags", "+faststart", "-an", str(mp4)])
    run([FFMPEG, "-y", "-ss", "1", "-i", str(f), "-frames:v", "1", "-vf", f"scale='min({MAX},iw)':-2", "-q:v", "3", str(poster)])
    manifest["2025"][num] = {"name": name, "type": "video", "video": f"/uploads/2025/{mp4.name}", "image": f"/uploads/2025/{poster.name}"}
    print(f"video {num:2d} {name:22s} -> {mp4.name} {mp4.stat().st_size // 1024} KB (+ cover)")

# ---------- 2024–2025: artworks from the PDF ----------
OUT_2024.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(SRC_2024)
for p, page in enumerate(doc, start=1):
    imgs = [doc.extract_image(i[0]) for i in page.get_images(full=True)]
    # the caption is a ~1100 px wide text image; the artwork is the other one
    art = min(imgs, key=lambda d: abs(d["width"] / d["height"] - 1100 / 645) < 0.08 and 1 or 0)
    import io
    with Image.open(io.BytesIO(art["image"])) as im:
        dest = OUT_2024 / f"{p:02d}.jpg"
        size = save_jpg(im, dest)
    manifest["2024"][p] = {"image": f"/uploads/2024/{dest.name}", "size": size}
    print(f"2024 page {p:2d} -> {dest.name} {size}")

(ROOT / "scripts" / "gallery-manifest.json").write_text(json.dumps(manifest, indent=2))
print("done")
