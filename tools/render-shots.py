#!/usr/bin/env python3
"""Stopgap screenshot renderer for the Vice Frame entry (see README.md).

Renders the four shots in shots.json with PIL, re-implementing the cover
layouts, grades, sun and lettering of app/src/cover.js with the same
sample photos, titles and grades. This is NOT a browser screenshot: the app
itself draws with canvas in a desktop browser. Replace every file in
screenshots/ with real browser screenshots before submitting (README.md
says how). This script exists only so the entry can be built and tested
end to end while no working browser is available here.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(REPO, "app", "samples")
OUT = os.path.join(REPO, "screenshots")


def font(size, bold=True):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


GRADES = {
    "sunset": {"accent": (255, 94, 58), "accent2": (255, 122, 217),
               "top": (255, 190, 80, 26), "mid": (255, 94, 58, 46), "bot": (255, 122, 217, 97)},
    "neon": {"accent": (255, 47, 179), "accent2": (34, 211, 238),
             "top": (255, 47, 179, 76), "mid": (120, 40, 200, 31), "bot": (34, 211, 238, 76)},
    "palm": {"accent": (255, 197, 61), "accent2": (14, 159, 138),
             "top": (14, 159, 138, 56), "mid": (255, 197, 61, 30), "bot": (255, 197, 61, 66)},
    "noir": {"accent": (232, 232, 232), "accent2": (90, 90, 110),
             "top": (10, 10, 25, 26), "mid": (10, 10, 25, 40), "bot": (10, 10, 25, 115)},
}


def panel_rects(layout, w, h):
    g = max(2, round(min(w, h) * 0.014))
    if layout == "grid":
        pw, ph = (w - 3 * g) // 2, (h - 3 * g) // 2
        return [(g, g, pw, ph), (2 * g + pw, g, pw, ph),
                (g, 2 * g + ph, pw, ph), (2 * g + pw, 2 * g + ph, pw, ph)]
    if layout == "strip":
        pw = (w - 4 * g) // 3
        return [(g + i * (pw + g), g, pw, h - 2 * g) for i in range(3)]
    if layout == "single":
        return [(g, g, w - 2 * g, h - 2 * g)]
    lw = round(w * 0.6)
    rw = w - lw - 3 * g
    rh = (h - 3 * g) // 2
    return [(g, g, lw - g, h - 2 * g), (lw + g, g, rw, rh), (lw + g, 2 * g + rh, rw, rh)]


def cover_fit(photo, rect, zoom=1.0, ox=0.0, oy=0.0):
    x, y, rw, rh = rect
    scale = max(rw / photo.width, rh / photo.height) * zoom
    dw, dh = round(photo.width * scale), round(photo.height * scale)
    resized = photo.resize((dw, dh), Image.LANCZOS)
    dx = x + (rw - dw) // 2 + round(ox * rw)
    dy = y + (rh - dh) // 2 + round(oy * rh)
    panel = Image.new("RGB", (rw, rh), (18, 8, 31))
    panel.paste(resized, (dx - x, dy - y))
    return panel


def grade_overlay(panel, grade):
    g = GRADES[grade]
    w, h = panel.size
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for yy in range(h):
        t = yy / max(1, h - 1)
        if t < 0.55:
            a = g["top"][3] + (g["mid"][3] - g["top"][3]) * (t / 0.55)
            c = tuple(round(g["top"][i] + (g["mid"][i] - g["top"][i]) * (t / 0.55)) for i in range(3))
        else:
            a = g["mid"][3] + (g["bot"][3] - g["mid"][3]) * ((t - 0.55) / 0.45)
            c = tuple(round(g["mid"][i] + (g["bot"][i] - g["mid"][i]) * ((t - 0.55) / 0.45)) for i in range(3))
        d.line([(0, yy), (w, yy)], fill=c + (round(a),))
    if grade == "noir":
        panel = panel.convert("L").convert("RGB")
    out = Image.alpha_composite(panel.convert("RGBA"), ov)
    # vignette
    vig = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(w, h) * 0.25))
    black = Image.new("RGBA", (w, h), (0, 0, 0, 72))
    out = Image.composite(out, Image.alpha_composite(out, black), vig)
    return out.convert("RGB")


def draw_sun(img, cx, cy, r):
    sun = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(sun)
    for yy in range(r * 2):
        t = yy / (r * 2)
        c = (255, round(210 - 130 * t), round(61 + 120 * t))
        d.line([(0, yy), (r * 2, yy)], fill=c + (255,))
    mask = Image.new("L", (r * 2, r * 2), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, r * 2, r * 2], fill=255)
    img.paste(sun, (cx - r, cy - r), mask)



def fit_font(text, max_w, start, floor=10):
    size = start
    while size > floor:
        f = font(size)
        if f.getlength(text) <= max_w:
            return f, size
        size -= 2
    return font(floor), floor


def draw_cover(w, h, layout, grade, photos, title, subtitle):
    img = Image.new("RGB", (w, h), (255, 255, 255))
    rects = panel_rects(layout, w, h)
    panels = [(0, 1.0, 0, 0), (1, 1.0, 0, 0), (0, 1.15, 0.05, 0), (1, 1.15, -0.05, 0)]
    for i, rect in enumerate(rects):
        pi, zoom, ox, oy = panels[i]
        panel = cover_fit(photos[pi % len(photos)], rect, zoom, ox, oy)
        panel = grade_overlay(panel, grade)
        img.paste(panel, (rect[0], rect[1]))
    d = ImageDraw.Draw(img, "RGBA")
    g = GRADES[grade]
    if layout != "single" and rects[0][2] > w * 0.45:
        fx, fy, fw, fh = rects[0]
        r = round(min(fw, fh) * 0.15)
        draw_sun(img, fx + int(fw * 0.8), fy + int(fh * 0.16), r)
        d = ImageDraw.Draw(img, "RGBA")
    # corner stripes
    for i, c in enumerate((g["accent"], g["accent2"], (255, 255, 255))):
        x0 = w * (0.90 + i * 0.035)
        d.polygon([(x0, 0), (x0 + w * 0.03, 0), (x0 + w * 0.03 - h * 0.07, h * 0.07),
                   (x0 - h * 0.07, h * 0.07)], fill=c)
    # subtitle bar
    if subtitle:
        fs = max(12, round(h * 0.028))
        f = font(fs)
        tw = f.getlength(subtitle) + fs * 2
        bx, by = w * 0.045, h * 0.045
        d.rectangle([bx, by, bx + tw, by + fs * 1.8], fill=(10, 5, 20, 217))
        d.rectangle([bx, by, bx + h * 0.008, by + fs * 1.8], fill=g["accent2"])
        d.text((bx + fs * 0.9, by + fs * 0.85), subtitle, font=f, fill=(255, 255, 255), anchor="lm")
    # title
    if title:
        text = title.upper()
        f, size = fit_font(text, w * 0.92, round(h * 0.115))
        tx, ty = w * 0.045, h - h * 0.055
        d.text((tx, ty), text, font=f, fill=(20, 8, 31), stroke_width=max(2, size // 12),
               stroke_fill=(20, 8, 31), anchor="ls")
        d.text((tx, ty), text, font=f, fill=(255, 255, 255), anchor="ls")
        d.rectangle([tx, ty + h * 0.018, tx + min(w * 0.42, f.getlength(text) * 0.55), ty + h * 0.026],
                    fill=g["accent"])
    d.rectangle([2, 2, w - 3, h - 3], outline=(20, 8, 31), width=max(4, round(w * 0.006)))
    return img


def draw_editor(w, h, cover_img):
    img = Image.new("RGB", (w, h), (18, 8, 31))
    d = ImageDraw.Draw(img)
    # controls column
    cw = round(w * 0.30)
    d.rounded_rectangle([16, 16, cw, h - 16], radius=14, fill=(29, 15, 51), outline=(74, 37, 102), width=2)
    f_big = font(round(h * 0.055))
    d.text((32, 34), "VICE FRAME", font=f_big, fill=(255, 122, 217))
    f = font(round(h * 0.022))
    d.text((32, 34 + round(h * 0.075)), "Your photo, made into a", font=f, fill=(205, 184, 230))
    d.text((32, 34 + round(h * 0.105)), "multi-panel poster cover.", font=f, fill=(205, 184, 230))
    labels = ["Layout: Hero + 2", "Grade: Neon Nights", "Title: Boulevard Queen",
              "Export: 1080 x 1080", "Photos: Pier, Boulevard"]
    y = round(h * 0.28)
    for lab in labels:
        d.rounded_rectangle([32, y, cw - 16, y + round(h * 0.055)], radius=8, fill=(42, 24, 69))
        d.text((44, y + round(h * 0.027)), lab, font=f, fill=(232, 220, 247), anchor="lm")
        y += round(h * 0.075)
    d.rounded_rectangle([32, y, cw - 16, y + round(h * 0.07)], radius=8, fill=(255, 94, 58))
    d.text(((32 + cw - 16) // 2, y + round(h * 0.035)), "Export PNG", font=font(round(h * 0.026)),
           fill=(255, 255, 255), anchor="mm")
    # preview
    px, py = cw + 32, 16
    pw, ph = w - px - 16, h - 32
    scale = min(pw / cover_img.width, ph / cover_img.height)
    cw2, ch2 = round(cover_img.width * scale), round(cover_img.height * scale)
    thumb = cover_img.resize((cw2, ch2), Image.LANCZOS)
    img.paste(thumb, (px + (pw - cw2) // 2, py + (ph - ch2) // 2))
    d.rectangle([px + (pw - cw2) // 2, py + (ph - ch2) // 2,
                 px + (pw - cw2) // 2 + cw2, py + (ph - ch2) // 2 + ch2],
                outline=(255, 255, 255), width=4)
    return img


def main():
    shots = json.load(open(os.path.join(REPO, "shots.json")))
    pier = Image.open(os.path.join(SAMPLES, "pier.jpg")).convert("RGB")
    blvd = Image.open(os.path.join(SAMPLES, "boulevard.jpg")).convert("RGB")
    os.makedirs(OUT, exist_ok=True)
    for shot in shots:
        q = shot["query"]
        params = dict(p.split("=", 1) for p in q.lstrip("?").split("&") if "=" in p)
        from urllib.parse import unquote
        params = {k: unquote(v) for k, v in params.items()}
        layout = params.get("layout", "hero")
        grade = params.get("grade", "sunset")
        title = params.get("caption", "Sunset Heist")
        subtitle = params.get("subtitle", "VICE CITY")
        size = params.get("size", "1080x1080")
        sw, sh = (int(x) for x in size.split("x"))
        first = pier if params.get("photo", "pier") == "pier" else blvd
        second = blvd if first is pier else pier
        cover = draw_cover(sw, sh, layout, grade, [first, second], title, subtitle)
        if params.get("shot") == "editor":
            out_img = draw_editor(shot["w"], shot["h"], cover)
        else:
            out_img = cover.resize((shot["w"], shot["h"]), Image.LANCZOS)
        path = os.path.join(OUT, shot["name"])
        out_img.save(path, "JPEG", quality=82, optimize=True)
        print(shot["name"], out_img.size, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
