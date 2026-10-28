#!/usr/bin/env python3
"""Regenerate the Tibetan "ཨ" extension icons.

Downloads Jomolhari (SIL OFL) if it is not already cached, renders the glyph
on a white canvas, crops to the glyph bounding box, scales it to fill ~90% of
the final icon while preserving aspect ratio, and exports icon16/48/128 PNGs.
"""

import os
import urllib.request

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(REPO_ROOT, "public", "icons")
FONT_URL = (
    "https://github.com/google/fonts/raw/main/ofl/jomolhari/Jomolhari-Regular.ttf"
)
FONT_CACHE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    ".cache",
    "Jomolhari-Regular.ttf",
)

GLYPH = "\u0F68"  # TIBETAN LETTER A
SIZES = [128, 48, 16]
FILL_RATIO = 0.90
SCALE_FACTOR = 8  # render at SCALE_FACTOR * target size, then downsample


def ensure_font() -> str:
    """Download and cache the font, returning its local path."""
    if os.path.exists(FONT_CACHE):
        print(f"Using cached font: {FONT_CACHE}")
        return FONT_CACHE

    os.makedirs(os.path.dirname(FONT_CACHE), exist_ok=True)
    print(f"Downloading font from {FONT_URL} ...")
    urllib.request.urlretrieve(FONT_URL, FONT_CACHE)
    print(f"Cached font: {FONT_CACHE} ({os.path.getsize(FONT_CACHE)} bytes)")
    return FONT_CACHE


def find_best_font_size(
    draw: ImageDraw.ImageDraw,
    font_path: str,
    max_width: int,
    max_height: int,
) -> ImageFont.FreeTypeFont:
    """Return the largest font size whose textbbox fits inside max_width/max_height."""
    low = 1
    high = max(max_width, max_height) * 2
    best_font = None

    while low <= high:
        mid = (low + high) // 2
        try:
            font = ImageFont.truetype(font_path, mid)
        except OSError:
            high = mid - 1
            continue

        bbox = draw.textbbox(
            (max_width // 2, max_height // 2), GLYPH, font=font, anchor="mm"
        )
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]

        if width <= max_width and height <= max_height:
            best_font = font
            low = mid + 1
        else:
            high = mid - 1

    if best_font is None:
        # Fallback to a tiny size
        best_font = ImageFont.truetype(
            font_path, max(1, min(max_width, max_height) // 2)
        )

    return best_font


def make_icon(size: int, font_path: str) -> Image.Image:
    """Render a single icon at the requested square size."""
    src_size = size * SCALE_FACTOR
    max_glyph = int(src_size * FILL_RATIO)

    src = Image.new("RGB", (src_size, src_size), "white")
    draw = ImageDraw.Draw(src)

    font = find_best_font_size(draw, font_path, max_glyph, max_glyph)

    # Draw the glyph centered on the high-res source canvas.
    draw.text(
        (src_size // 2, src_size // 2),
        GLYPH,
        fill="black",
        font=font,
        anchor="mm",
    )

    # Crop to the glyph's bounding box.
    mask = src.convert("L").point(lambda p: 0 if p == 255 else 255, mode="L")
    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError("Glyph was not rendered")
    cropped = src.crop(bbox)

    # Scale the cropped glyph so its larger dimension fills FILL_RATIO of the final icon.
    target = Image.new("RGB", (size, size), "white")
    max_final = int(size * FILL_RATIO)
    scale = max_final / max(cropped.width, cropped.height)
    resized = cropped.resize(
        (
            round(cropped.width * scale),
            round(cropped.height * scale),
        ),
        Image.Resampling.LANCZOS,
    )

    paste_x = (size - resized.width) // 2
    paste_y = (size - resized.height) // 2
    target.paste(resized, (paste_x, paste_y))

    return target


def coverage(img: Image.Image) -> tuple:
    """Return coverage ratios for the non-white glyph in the icon."""
    mask = img.convert("L").point(lambda p: 0 if p == 255 else 255, mode="L")
    bbox = mask.getbbox()
    if bbox is None:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    x1, y1, x2, y2 = bbox
    w, h = img.size
    bbox_width = x2 - x1
    bbox_height = y2 - y1
    bbox_area = bbox_width * bbox_height
    total_area = w * h

    hist = mask.histogram()
    nonwhite = total_area - hist[0]

    return (
        bbox_width / w,
        bbox_height / h,
        bbox_area / total_area,
        nonwhite / total_area,
        nonwhite / bbox_area if bbox_area else 0.0,
    )


def main() -> None:
    font_path = ensure_font()
    os.makedirs(ICONS_DIR, exist_ok=True)

    for size in SIZES:
        icon = make_icon(size, font_path)
        out_path = os.path.join(ICONS_DIR, f"icon{size}.png")
        icon.save(out_path, "PNG")

        w_ratio, h_ratio, bbox_area_ratio, area_ratio, density = coverage(icon)
        print(
            f"icon{size}.png: {size}x{size} | "
            f"bbox width={w_ratio:.2%}, height={h_ratio:.2%}, "
            f"bbox area={bbox_area_ratio:.2%} | "
            f"non-white/canvas={area_ratio:.2%}, non-white/bbox={density:.2%}"
        )


if __name__ == "__main__":
    main()
