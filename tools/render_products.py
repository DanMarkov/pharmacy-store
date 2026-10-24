#!/usr/bin/env python3
"""Генератор студийных PNG-фото товаров SPM Pharmacy.

Рендерит 12 товаров в фотореалистичном студийном стиле (белый sweep-фон,
контактная тень, отражение на глянцевой поверхности, объёмный свет,
стекло/металл/пластик, этикетки SPM со штрихкодом) и сохраняет
assets/products/<id>.png (800×800).

Зависимости: pillow, numpy, matplotlib (только ради шрифтов DejaVu).
Запуск: python3 tools/render_products.py
"""

import colorsys
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 1600
FINAL = 800
FLOOR_Y = 1250

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "products")

import matplotlib
FDIR = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf")

_FONT_CACHE = {}


def F(name, size):
    key = (name, size)
    if key not in _FONT_CACHE:
        _FONT_CACHE[key] = ImageFont.truetype(os.path.join(FDIR, name), size)
    return _FONT_CACHE[key]


PRODUCTS = [
    dict(id="rosinka-09", art="flacon", hue=205, short="РОСА №09", dose="90 мл"),
    dict(id="ampula-tuman", art="ampoule", hue=190, short="ТУМАН", dose="2 мл"),
    dict(id="shpric-gorizont", art="syringe", hue=160, short="ГОРИЗОНТ", dose="5 мл"),
    dict(id="maz-poliklinika", art="tube", hue=45, short="ПОЛИКЛИНИКА", dose="40 г"),
    dict(id="banka-dushi", art="jar", hue=280, short="ДУШИ", dose="250 мл"),
    dict(id="ingalyator-veter", art="inhaler", hue=140, short="ВЕТЕР", dose="120 вдохов"),
    dict(id="kapsula-zabvenie", art="capsule", hue=330, short="ЗАБВЕНИЕ", dose="1 капс."),
    dict(id="sprey-dozhd", art="spray", hue=220, short="ДОЖДЬ", dose="200 мл"),
    dict(id="plastyr-mechta", art="patch", hue=25, short="МЕЧТА", dose="1 шт."),
    dict(id="fлakon-utro", art="bottle", hue=75, short="УТРО", dose="200 мл"),
    dict(id="kartochka-sluchainoe", art="vial", hue=300, short="СЧАСТЬЕ", dose="5 × 1 мл"),
    dict(id="korobka-tishina", art="box", hue=250, short="ТИШИНА", dose="1 кор."),
]


def hsv(h, s, v):
    r, g, b = colorsys.hsv_to_rgb((h % 360) / 360.0, s, v)
    return (r, g, b)


def rgb255(c):
    return tuple(int(round(min(1.0, max(0.0, x)) * 255)) for x in c)


def studio_bg():
    xs = (np.arange(S, dtype=np.float32) - S * 0.5) / S
    ys = (np.arange(S, dtype=np.float32) - S * 0.42) / S
    X, Y = np.meshgrid(xs, ys)
    r = np.sqrt(X ** 2 + Y ** 2) / 0.62
    c0 = np.array([255, 255, 255], np.float32)
    c1 = np.array([248, 251, 253], np.float32)
    c2 = np.array([228, 236, 241], np.float32)
    t1 = np.clip(r / 0.68, 0, 1)
    t2 = np.clip((r - 0.68) / 0.32, 0, 1)
    col_lo = c0[None, None, :] + (c1 - c0)[None, None, :] * t1[..., None]
    col_hi = c1[None, None, :] + (c2 - c1)[None, None, :] * t2[..., None]
    col = np.where((r >= 0.68)[..., None], col_hi, col_lo)
    arr = np.dstack([col.astype(np.uint8), np.full((S, S, 1), 255, np.uint8)])
    return Image.fromarray(arr, "RGBA")


def rect_mask(x0, y0, x1, y1, r=0):
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    if r > 0:
        d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=255)
    else:
        d.rectangle([x0, y0, x1, y1], fill=255)
    return np.array(m)


def ellipse_mask(cx, cy, rx, ry):
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return np.array(m)


def poly_mask(points):
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    d.polygon(points, fill=255)
    return np.array(m)


def paint(base, mask, color_fn, alpha=1.0):
    xs = (np.arange(S, dtype=np.float32)[None, :] / S)
    ys = (np.arange(S, dtype=np.float32)[:, None] / S)
    col = color_fn(xs, ys).astype(np.float32) * 255.0
    col = np.clip(col, 0, 255).astype(np.uint8)
    a = np.clip(mask.astype(np.float32) * alpha, 0, 255).astype(np.uint8)
    layer = np.dstack([col, a[..., None]])
    base.alpha_composite(Image.fromarray(layer, "RGBA"))
    return base


def solid(r, g, b):
    return lambda xs, ys: np.stack(
        [np.full((S, S), r / 255.0, np.float32), np.full((S, S), g / 255.0, np.float32),
         np.full((S, S), b / 255.0, np.float32)], -1)


def vshade(x0, x1):
    t = (np.arange(S, dtype=np.float32) - x0) / max(1, x1 - x0)
    prof = (0.55
            + 0.78 * np.exp(-((t - 0.20) ** 2) / (2 * 0.055 ** 2))
            + 0.16 * np.exp(-((t - 0.90) ** 2) / (2 * 0.035 ** 2))
            - 0.30 * np.exp(-((t - 0.62) ** 2) / (2 * 0.17 ** 2)))
    return np.clip(prof, 0.22, 1.65)[None, :]


def hshade(y0, y1):
    t = (np.arange(S, dtype=np.float32) - y0) / max(1, y1 - y0)
    prof = (1.18 - 0.5 * t
            + 0.35 * np.exp(-((t - 0.16) ** 2) / (2 * 0.05 ** 2)))
    return np.clip(prof, 0.3, 1.7)[:, None]


def vcyl(base, x0, x1, y0, y1, color, alpha=1.0, top=True, bot=True, metal=False):
    m = rect_mask(x0, y0, x1, y1).astype(np.float32)
    prof = vshade(x0, x1)
    if metal:
        prof = np.clip(prof * 1.25 - 0.1, 0.15, 1.9)
    r, g, b = [c / 255.0 for c in color]
    def cf(xs, ys):
        p = prof * np.ones((S, 1), np.float32)
        return np.stack([np.full((S, S), r, np.float32) * p,
                         np.full((S, S), g, np.float32) * p,
                         np.full((S, S), b, np.float32) * p], -1)
    paint(base, m, cf, alpha)
    ry = max(6, (x1 - x0) // 2 * 0.28)
    cx = (x0 + x1) // 2
    if top:
        em = ellipse_mask(cx, y0, (x1 - x0) // 2, ry).astype(np.float32)
        paint(base, em, cf, alpha * 0.92)
    if bot:
        em = ellipse_mask(cx, y1, (x1 - x0) // 2, ry).astype(np.float32)
        paint(base, em, cf, alpha * 0.8)
    return base


def hcyl(base, x0, x1, y0, y1, color, alpha=1.0, left=True, right=True, metal=False):
    m = rect_mask(x0, y0, x1, y1).astype(np.float32)
    prof = hshade(y0, y1)
    if metal:
        prof = np.clip(prof * 1.2 - 0.08, 0.18, 1.9)
    r, g, b = [c / 255.0 for c in color]
    def cf(xs, ys):
        p = prof * np.ones((1, S), np.float32)
        return np.stack([np.full((S, S), r, np.float32) * p,
                         np.full((S, S), g, np.float32) * p,
                         np.full((S, S), b, np.float32) * p], -1)
    paint(base, m, cf, alpha)
    rx = max(5, (y1 - y0) // 2 * 0.28)
    cy = (y0 + y1) // 2
    if left:
        paint(base, ellipse_mask(x0, cy, rx, (y1 - y0) // 2).astype(np.float32), cf, alpha * 0.9)
    if right:
        paint(base, ellipse_mask(x1, cy, rx, (y1 - y0) // 2).astype(np.float32), cf, alpha * 0.8)
    return base


def ribs(base, x0, x1, y0, y1, period=18):
    xs = np.arange(S)[None, :]
    stripe = (((xs // period) % 2) == 0).astype(np.float32) * 255
    rm = rect_mask(x0, y0, x1, y1).astype(np.float32)
    dark = (rm * (stripe > 0)).astype(np.uint8)
    light = (rm * (stripe == 0) * 0.55).astype(np.uint8)
    paint(base, dark, solid(0, 0, 0), 0.22)
    paint(base, light, solid(255, 255, 255), 0.16)
    return base


def glass_edges(base, x0, x1, y0, y1, color, alpha=0.5, w=12):
    paint(base, rect_mask(x0, y0, x0 + w, y1).astype(np.float32),
          solid(*rgb255(color)), alpha)
    paint(base, rect_mask(x1 - w, y0, x1, y1).astype(np.float32),
          solid(*rgb255(color)), alpha)
    return base


def vhilite(base, x, y0, y1, w, alpha, blur=6):
    m = rect_mask(x, y0, x + w, y1)
    m = np.array(Image.fromarray(m).filter(ImageFilter.GaussianBlur(blur)))
    paint(base, m, solid(255, 255, 255), alpha)
    return base


def hhilite(base, x0, x1, y, h, alpha, blur=6):
    m = rect_mask(x0, y, x1, y + h)
    m = np.array(Image.fromarray(m).filter(ImageFilter.GaussianBlur(blur)))
    paint(base, m, solid(255, 255, 255), alpha)
    return base


def meniscus_v(base, cx, y_liq, rx, ry=7, color=(255, 255, 255), alpha=0.55):
    m = ellipse_mask(cx, y_liq, rx, ry)
    m = np.array(Image.fromarray(m).filter(ImageFilter.GaussianBlur(2)))
    paint(base, m, solid(*color), alpha)
    m2 = ellipse_mask(cx, y_liq + ry + 3, rx - 4, ry - 2).astype(np.float32)
    paint(base, m2, solid(20, 40, 60), 0.18)
    return base


def meniscus_h(base, x_liq, cy, ry, rx=7, color=(255, 255, 255), alpha=0.5):
    m = ellipse_mask(x_liq, cy, rx, ry)
    m = np.array(Image.fromarray(m).filter(ImageFilter.GaussianBlur(2)))
    paint(base, m, solid(*color), alpha)
    dark = ellipse_mask(x_liq + rx + 4, cy, max(3, rx - 3), max(2, ry - 3))
    paint(base, dark, solid(20, 45, 40), 0.25)
    return base


def ctext(d, cx, y, text, font, fill, tracking=0):
    if tracking:
        total = sum(d.textlength(ch, font=font) for ch in text) + tracking * (len(text) - 1)
        x = cx - total / 2
        for ch in text:
            d.text((x, y), ch, font=font, fill=fill)
            x += d.textlength(ch, font=font) + tracking
    else:
        w = d.textlength(text, font=font)
        d.text((cx - w / 2, y), text, font=font, fill=fill)


def text_layer(items):
    tl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(tl)
    for it in items:
        xy, text, fname, size, fill = it[:5]
        tracking = it[5] if len(it) > 5 else 0
        if xy == "center":
            raise ValueError("use ctext items instead")
        f = F(fname, size)
        if tracking:
            x, y = xy
            for ch in text:
                d.text((x, y), ch, font=f, fill=fill)
                x += d.textlength(ch, font=f) + tracking
        else:
            d.text(xy, text, font=f, fill=fill)
    return tl


def barcode_mask(x0, y0, x1, y1, seed):
    rng = np.random.default_rng(seed)
    m = np.zeros((S, S), np.uint8)
    x = x0 + 5
    guard_end = x1 - 5
    m[y0:y1, x0 + 5:x0 + 9] = 240
    m[y0:y1, x1 - 9:x1 - 5] = 240
    m[y0:y1, (x0 + x1) // 2 - 2:(x0 + x1) // 2 + 2] = 240
    m[y0:y1, (x0 + x1) // 2 - 9:(x0 + x1) // 2 - 5] = 240
    m[y0:y1, (x0 + x1) // 2 + 5:(x0 + x1) // 2 + 9] = 240
    while x < guard_end - 12:
        bw = int(rng.integers(3, 8)) if rng.random() < 0.6 else int(rng.integers(8, 15))
        if rng.random() < 0.85:
            m[y0:y1, x:min(x + bw, guard_end)] = 240
        x += bw + int(rng.integers(2, 7))
    return m


def label(base, x0, y0, x1, y1, item, seed, r=14):
    sh = rect_mask(x0 + 5, y0 + 8, x1 + 5, y1 + 8, r)
    sh = np.array(Image.fromarray(sh).filter(ImageFilter.GaussianBlur(7)))
    paint(base, sh, solid(50, 70, 90), 0.28)
    paint(base, rect_mask(x0, y0, x1, y1, r), solid(255, 255, 255), 0.97)
    tl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(tl)
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, outline=(198, 209, 218, 255), width=3)
    cx = (x0 + x1) // 2
    ctext(d, cx, y0 + 30, "SPM", F("DejaVuSans-Bold.ttf", 62), (39, 66, 148, 255))
    ctext(d, cx, y0 + 112, item["short"], F("DejaVuSans-Bold.ttf", 32), (29, 58, 82, 255), tracking=4)
    ctext(d, cx, y0 + 156, item["dose"], F("DejaVuSans.ttf", 29), (95, 112, 125, 255))
    base.alpha_composite(tl)
    bw = x1 - x0 - 56
    paint(base, barcode_mask(x0 + 28, y1 - 72, x1 - 28, y1 - 44, seed),
          solid(25, 30, 38), 0.9)
    tl2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(tl2)
    ctext(d2, cx, y1 - 38, "8 40012 00009 7", F("DejaVuSansMono.ttf", 20), (60, 70, 80, 255), tracking=3)
    base.alpha_composite(tl2)
    return base


def reflect(obj, floor_y=FLOOR_Y, strength=0.13):
    arr = np.array(obj)
    out = np.zeros_like(arr)
    ys = np.arange(S)
    dst = 2 * floor_y - ys
    valid = (dst >= 0) & (dst < S)
    out[dst[valid]] = arr[ys[valid]]
    out[:floor_y] = 0
    fade = np.zeros(S, np.float32)
    below = ys > floor_y
    fade[below] = np.clip(1 - (ys[below] - floor_y) / (0.30 * (S - floor_y)), 0, 1) ** 1.5
    out[..., 3] = (out[..., 3].astype(np.float32) * fade[:, None] * strength / 0.13).astype(np.uint8)
    return Image.fromarray(out).filter(ImageFilter.GaussianBlur(5))


def contact_shadow(base, cx, cy, rx, ry, alpha):
    yy, xx = np.mgrid[0:S, 0:S]
    e = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    sh = np.zeros((S, S), np.float32)
    sh[e] = 255
    blur = max(10, int(ry * 0.35))
    sh = np.array(Image.fromarray(sh.astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)))
    core = np.zeros((S, S), np.float32)
    core[e] = 255
    paint(base, sh, solid(30, 50, 70), alpha)
    paint(base, core, solid(30, 50, 70), alpha * 0.55)
    return base


def compose(draw_fn, item, shadows, refl_y=FLOOR_Y, refl_strength=0.13):
    obj = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_fn(obj, item)
    base = studio_bg()
    base.alpha_composite(reflect(obj, refl_y, refl_strength))
    for (cx, cy, rx, ry, a) in shadows:
        contact_shadow(base, cx, cy, rx, ry, a)
    base.alpha_composite(obj)
    return base.resize((FINAL, FINAL), Image.Resampling.LANCZOS).convert("RGB")


def seed_of(item):
    return sum(ord(c) for c in item["id"]) * 7 + 13


def obj_flacon(base, it):
    liq = rgb255(hsv(it["hue"], 0.5, 0.92))
    edge = rgb255(hsv(it["hue"], 0.35, 0.72))
    vcyl(base, 706, 894, 822, 1234, liq, 0.88, top=False)
    meniscus_v(base, 800, 822, 86)
    vcyl(base, 690, 910, 700, 1250, (236, 246, 251), 0.30)
    glass_edges(base, 690, 910, 700, 1250, edge, 0.5)
    vhilite(base, 716, 712, 1240, 26, 0.5)
    vhilite(base, 872, 712, 1240, 12, 0.22, blur=4)
    vcyl(base, 762, 838, 620, 706, (236, 246, 251), 0.35, bot=False)
    glass_edges(base, 762, 838, 620, 706, edge, 0.4, w=8)
    cap = rgb255(hsv(215, 0.55, 0.32))
    vcyl(base, 748, 852, 550, 622, cap, 1.0)
    ribs(base, 750, 850, 552, 620)
    vcyl(base, 784, 816, 510, 552, cap, 1.0, bot=False)
    vhilite(base, 758, 554, 618, 10, 0.35, blur=3)
    label(base, 712, 900, 888, 1128, it, seed_of(it))


def obj_ampoule(base, it):
    liq = rgb255(hsv(it["hue"], 0.45, 0.9))
    edge = rgb255(hsv(it["hue"], 0.3, 0.7))
    glass = (238, 248, 251)
    vcyl(base, 688, 912, 1002, 1234, liq, 0.85, top=False)
    meniscus_v(base, 800, 1002, 106, ry=9)
    vcyl(base, 680, 920, 884, 1250, glass, 0.32)
    glass_edges(base, 680, 920, 884, 1250, edge, 0.5)
    waist = poly_mask([(680, 884), (920, 884), (838, 706), (762, 706)])
    prof = vshade(762, 838)
    r, g, b = [c / 255.0 for c in glass]
    paint(base, waist.astype(np.float32), lambda xs, ys: np.stack(
        [np.full((S, S), r, np.float32) * prof, np.full((S, S), g, np.float32) * prof,
         np.full((S, S), b, np.float32) * prof], -1), 0.32)
    vcyl(base, 770, 830, 600, 710, glass, 0.38, bot=False)
    bulb = ellipse_mask(800, 566, 52, 46).astype(np.float32)
    paint(base, bulb, solid(*glass), 0.4)
    paint(base, ellipse_mask(800, 578, 34, 24).astype(np.float32), solid(*liq), 0.5)
    vhilite(base, 706, 892, 1240, 24, 0.5)
    vhilite(base, 880, 892, 1240, 10, 0.2, blur=4)
    label(base, 724, 1108, 876, 1216, it, seed_of(it), r=10)


def obj_syringe(base, it):
    liq = rgb255(hsv(it["hue"], 0.45, 0.88))
    glass = (240, 248, 252)
    metal = (172, 180, 188)
    hub = (118, 126, 134)
    hcyl(base, 384, 560, 946, 954, metal, 1.0, right=False, metal=True)
    hub_pts = [(384, 940), (560, 940), (560, 960), (384, 960),
               (370, 944), (384, 940), (370, 956), (384, 960)]
    paint(base, poly_mask(hub_pts), solid(*hub), 1.0)
    needle = poly_mask([(356, 948), (176, 949), (176, 951), (356, 952)])
    paint(base, needle, solid(205, 214, 222), 1.0)
    paint(base, poly_mask([(176, 949), (150, 950), (176, 951)]), solid(190, 200, 210), 1.0)
    paint(base, rect_mask(356, 947, 360, 953).astype(np.float32), solid(255, 255, 255), 0.8)
    hcyl(base, 546, 606, 918, 982, (140, 148, 156), 1.0, metal=True)
    hcyl(base, 600, 812, 914, 986, liq, 0.85, left=False)
    meniscus_h(base, 812, 950, 34)
    paint(base, ellipse_mask(606, 950, 8, 34).astype(np.float32), solid(*liq), 0.6)
    hcyl(base, 560, 1060, 905, 995, glass, 0.34, left=False)
    paint(base, rect_mask(810, 914, 816, 986).astype(np.float32), solid(90, 130, 125), 0.30)
    hhilite(base, 830, 1040, 912, 8, 0.35, blur=3)
    paint(base, rect_mask(560, 905, 572, 995).astype(np.float32), solid(150, 175, 190), 0.4)
    paint(base, rect_mask(1048, 905, 1060, 995).astype(np.float32), solid(150, 175, 190), 0.4)
    ticks = np.zeros((S, S), np.float32)
    x = 624
    i = 0
    while x < 1046:
        h = 26 if i % 5 == 0 else 16
        ticks[912:912 + h, x:x + 4] = 255
        x += 42
        i += 1
    paint(base, ticks.astype(np.uint8), solid(40, 55, 70), 0.5)
    hcyl(base, 1000, 1044, 912, 988, (58, 62, 68), 1.0, left=False)
    hcyl(base, 1044, 1178, 938, 962, (118, 126, 134), 1.0, left=False, metal=True)
    paint(base, ellipse_mask(1206, 950, 24, 78).astype(np.float32), solid(88, 94, 102), 1.0)
    paint(base, ellipse_mask(1206, 950, 24, 78).astype(np.float32) * 0, solid(88, 94, 102), 0.0)
    paint(base, ellipse_mask(1206, 950, 14, 78).astype(np.float32), solid(120, 128, 136), 1.0)
    paint(base, ellipse_mask(1064, 950, 13, 94).astype(np.float32), solid(198, 208, 216), 0.95)
    for wy in (908, 936, 964, 992):
        paint(base, rect_mask(1044, wy, 1178, wy + 5).astype(np.float32), solid(80, 88, 96), 0.5)
    paint(base, ellipse_mask(1064, 950, 8, 88).astype(np.float32), solid(230, 238, 244), 0.6)
    hhilite(base, 572, 1048, 910, 12, 0.45)
    hhilite(base, 1048, 1172, 940, 6, 0.4, blur=3)
    hhilite(base, 180, 352, 948, 2, 0.9, blur=1)


def obj_tube(base, it):
    body_c = rgb255(hsv(it["hue"], 0.32, 0.97))
    dark = rgb255(hsv(it["hue"], 0.45, 0.72))
    cap = rgb255(hsv(it["hue"], 0.5, 0.78))
    vcyl(base, 700, 900, 1178, 1250, cap, 1.0, top=True, bot=True)
    ribs(base, 702, 898, 1180, 1248, period=22)
    body = poly_mask([(714, 1180), (886, 1180), (862, 668), (738, 668)])
    prof = vshade(738, 862)
    r, g, b = [c / 255.0 for c in body_c]
    paint(base, body.astype(np.float32), lambda xs, ys: np.stack(
        [np.full((S, S), r, np.float32) * prof, np.full((S, S), g, np.float32) * prof,
         np.full((S, S), b, np.float32) * prof], -1), 1.0)
    paint(base, ellipse_mask(800, 668, 62, 14).astype(np.float32), solid(*body_c), 0.9)
    seam = rect_mask(730, 622, 870, 652).astype(np.float32)
    paint(base, seam, solid(*dark), 0.95)
    for yy in range(624, 652, 7):
        paint(base, rect_mask(732, yy, 868, yy + 2).astype(np.float32), solid(60, 45, 20), 0.35)
    vhilite(base, 748, 690, 1160, 20, 0.5)
    vhilite(base, 846, 700, 1160, 9, 0.2, blur=4)
    label(base, 742, 780, 858, 1100, it, seed_of(it), r=10)


def obj_jar(base, it):
    cream = rgb255(hsv(it["hue"], 0.3, 0.96))
    edge = rgb255(hsv(it["hue"], 0.35, 0.75))
    cap = rgb255(hsv(it["hue"], 0.55, 0.68))
    vcyl(base, 634, 966, 952, 1234, cream, 0.95, top=False)
    meniscus_v(base, 800, 952, 160, ry=12)
    vcyl(base, 620, 980, 880, 1250, (244, 240, 250), 0.30)
    glass_edges(base, 620, 980, 880, 1250, edge, 0.45, w=16)
    vhilite(base, 652, 892, 1240, 30, 0.45)
    vhilite(base, 950, 892, 1240, 13, 0.2, blur=4)
    vcyl(base, 610, 990, 800, 890, cap, 1.0)
    ribs(base, 612, 988, 802, 888, period=26)
    vhilite(base, 640, 806, 884, 14, 0.4)
    label(base, 664, 986, 936, 1196, it, seed_of(it))


def obj_inhaler(base, it):
    body_c = rgb255(hsv(it["hue"], 0.5, 0.82))
    dark = rgb255(hsv(it["hue"], 0.5, 0.62))
    vcyl(base, 720, 880, 800, 1250, body_c, 1.0)
    vhilite(base, 738, 812, 1240, 18, 0.4)
    vhilite(base, 862, 812, 1240, 8, 0.18, blur=4)
    vcyl(base, 736, 864, 742, 806, dark, 1.0)
    vcyl(base, 778, 822, 716, 746, rgb255(hsv(it["hue"], 0.45, 0.5)), 1.0, bot=False)
    paint(base, ellipse_mask(800, 716, 22, 7).astype(np.float32),
          solid(*rgb255(hsv(it["hue"], 0.45, 0.62))), 1.0)
    vcyl(base, 776, 824, 640, 718, body_c, 1.0, bot=False)
    hcyl(base, 824, 946, 656, 700, body_c, 1.0, left=False)
    paint(base, ellipse_mask(946, 678, 12, 22).astype(np.float32), solid(*body_c), 1.0)
    paint(base, ellipse_mask(940, 678, 6, 12).astype(np.float32), solid(30, 50, 45), 0.9)
    vhilite(base, 786, 646, 712, 8, 0.35, blur=3)
    hhilite(base, 830, 940, 659, 8, 0.35, blur=3)
    label(base, 732, 900, 868, 1150, it, seed_of(it), r=10)


def _capsule_layer(it):
    L = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    x0, x1, y0, y1 = 570, 1030, 925, 1075
    half1 = rgb255(hsv(it["hue"], 0.62, 0.93))
    half2 = (247, 241, 230)
    hcyl(L, x0, 800, y0, y1, half1, 1.0, left=True, right=False)
    hcyl(L, 800, x1, y0, y1, half2, 1.0, left=False, right=True)
    paint(L, rect_mask(797, y0 + 4, 803, y1 - 4).astype(np.float32), solid(60, 30, 40), 0.3)
    hhilite(L, x0 + 24, x1 - 24, y0 + 8, 26, 0.5, blur=8)
    paint(L, rect_mask(x0 + 30, y1 - 26, x1 - 30, y1 - 8).astype(np.float32), solid(40, 30, 50), 0.18)
    return L


def obj_capsule(base, it):
    c1 = _capsule_layer(it).rotate(-14, resample=Image.Resampling.BICUBIC, center=(800, 1000))
    c2 = _capsule_layer(it).rotate(9, resample=Image.Resampling.BICUBIC, center=(800, 1000))
    base.alpha_composite(c1)
    base.alpha_composite(c2)


def obj_spray(base, it):
    metal_c = rgb255(hsv(it["hue"], 0.55, 0.72))
    dark = rgb255(hsv(it["hue"], 0.5, 0.4))
    vcyl(base, 700, 900, 706, 1234, metal_c, 1.0, top=False, metal=True)
    paint(base, ellipse_mask(800, 706, 100, 26).astype(np.float32), solid(*metal_c), 0.9)
    hsh = hshade(706, 732)
    paint(base, ellipse_mask(800, 706, 100, 26).astype(np.float32), solid(*metal_c), 0.35)
    vhilite(base, 722, 716, 1226, 24, 0.75)
    vhilite(base, 872, 716, 1226, 11, 0.35, blur=4)
    vcyl(base, 768, 832, 636, 668, dark, 1.0, bot=False)
    paint(base, rect_mask(830, 640, 862, 662).astype(np.float32), solid(*dark), 1.0)
    paint(base, ellipse_mask(862, 651, 7, 11).astype(np.float32), solid(20, 35, 60), 0.95)
    vhilite(base, 776, 640, 664, 8, 0.4, blur=3)
    cap_glass = (210, 232, 244)
    vcyl(base, 986, 1114, 1064, 1234, cap_glass, 0.45, top=False)
    paint(base, ellipse_mask(1050, 1064, 64, 16).astype(np.float32), solid(*cap_glass), 0.5)
    vhilite(base, 1002, 1072, 1226, 14, 0.5, blur=4)
    label(base, 716, 862, 884, 1136, it, seed_of(it))


def obj_patch(base, it):
    L = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    x0, x1, y0, y1 = 480, 1120, 850, 1190
    xs = (np.arange(S, dtype=np.float32)[None, :] - 800) / 320.0
    ys = (np.arange(S, dtype=np.float32)[:, None] - 1020) / 170.0
    edge_t = np.clip(np.sqrt(xs ** 2 + ys ** 2), 0, 1)
    base_c = np.array(rgb255(hsv(it["hue"], 0.35, 0.95)), np.float32)
    dark_c = np.array(rgb255(hsv(it["hue"], 0.4, 0.82)), np.float32)
    col = base_c[None, None, :] + (dark_c - base_c)[None, None, :] * (edge_t ** 2)[..., None]
    m = rect_mask(x0, y0, x1, y1, r=80).astype(np.float32)
    paint(L, m, lambda a, b: col * 0 + col, 1.0)
    pad_sh = rect_mask(702, 958, 898, 1098, r=24)
    pad_sh = np.array(Image.fromarray(pad_sh).filter(ImageFilter.GaussianBlur(5)))
    paint(L, pad_sh, solid(120, 85, 55), 0.35)
    paint(L, rect_mask(700, 950, 900, 1090, r=24), solid(247, 231, 211), 0.97)
    tl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(tl)
    ctext(d, 800, 1002, "SPM", F("DejaVuSans-Bold.ttf", 30), (185, 150, 118, 255), tracking=6)
    L.alpha_composite(tl)
    hhilite(L, x0 + 40, x1 - 40, y0 + 14, 26, 0.16, blur=8)
    rot = L.rotate(-16, resample=Image.Resampling.BICUBIC, center=(800, 1020))
    base.alpha_composite(rot)


def obj_bottle(base, it):
    liq = rgb255(hsv(it["hue"], 0.4, 0.88))
    edge = rgb255(hsv(it["hue"], 0.3, 0.7))
    cap = rgb255(hsv(it["hue"], 0.5, 0.62))
    vcyl(base, 694, 906, 944, 1234, liq, 0.85, top=False)
    meniscus_v(base, 800, 944, 100, ry=8)
    vcyl(base, 690, 910, 860, 1250, (240, 247, 244), 0.32)
    glass_edges(base, 690, 910, 860, 1250, edge, 0.5)
    shoulders = poly_mask([(690, 860), (910, 860), (845, 782), (755, 782)])
    prof = vshade(755, 845)
    paint(base, shoulders.astype(np.float32), lambda xs, ys: np.stack(
        [np.full((S, S), 240 / 255.0, np.float32) * prof,
         np.full((S, S), 247 / 255.0, np.float32) * prof,
         np.full((S, S), 244 / 255.0, np.float32) * prof], -1), 0.34)
    vcyl(base, 755, 845, 700, 788, (240, 247, 244), 0.36, bot=False)
    vcyl(base, 745, 855, 640, 706, cap, 1.0)
    ribs(base, 747, 853, 642, 704, period=14)
    vhilite(base, 716, 648, 700, 10, 0.4, blur=3)
    vhilite(base, 716, 872, 1240, 24, 0.5)
    vhilite(base, 878, 872, 1240, 11, 0.2, blur=4)
    label(base, 710, 962, 890, 1180, it, seed_of(it))


def obj_vial(base, it):
    box_front = [(540, 900), (1060, 900), (1060, 1092), (540, 1092)]
    box_top = [(540, 900), (1060, 900), (1112, 848), (592, 848)]
    box_side = [(1060, 900), (1112, 848), (1112, 1040), (1060, 1092)]
    paint(base, poly_mask(box_front), solid(243, 238, 250), 1.0)
    paint(base, poly_mask(box_top), solid(251, 248, 254), 1.0)
    paint(base, poly_mask(box_side), solid(222, 213, 234), 1.0)
    tl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(tl)
    ctext(d, 800, 946, "SPM", F("DejaVuSans-Bold.ttf", 62), (39, 66, 148, 255))
    ctext(d, 800, 1022, "5 × 1 мл", F("DejaVuSans.ttf", 30), (95, 112, 125, 255))
    base.alpha_composite(tl)
    liq = rgb255(hsv(it["hue"], 0.55, 0.85))
    cap = rgb255(hsv(it["hue"], 0.5, 0.42))
    for c in (640, 760, 880, 1000, 1120):
        vcyl(base, c - 31, c + 31, 1082, 1230, liq, 0.85, top=False)
        meniscus_v(base, c, 1082, 27, ry=4)
        vcyl(base, c - 37, c + 37, 1020, 1240, (242, 236, 246), 0.34)
        glass_edges(base, c - 37, c + 37, 1020, 1240, rgb255(hsv(it["hue"], 0.35, 0.7)), 0.45, w=6)
        vcyl(base, c - 30, c + 30, 978, 1022, cap, 1.0)
        ribs(base, c - 29, c + 29, 980, 1020, period=9)
        vhilite(base, c - 26, 1030, 1230, 8, 0.5, blur=3)
        paint(base, rect_mask(c - 26, 1120, c + 26, 1196).astype(np.float32), solid(255, 255, 255), 0.95)
        paint(base, rect_mask(c - 10, 1130, c + 10, 1136).astype(np.float32), solid(39, 66, 148), 1.0)
        paint(base, rect_mask(c - 18, 1148, c + 18, 1152).astype(np.float32), solid(150, 160, 170), 0.8)
        paint(base, rect_mask(c - 18, 1160, c + 18, 1164).astype(np.float32), solid(150, 160, 170), 0.8)


def obj_box(base, it):
    front = [(560, 780), (1040, 780), (1040, 1250), (560, 1250)]
    top = [(560, 780), (1040, 780), (1110, 712), (630, 712)]
    side = [(1040, 780), (1110, 712), (1110, 1182), (1040, 1250)]
    c_front = rgb255(hsv(it["hue"], 0.32, 0.8))
    paint(base, poly_mask(front), solid(*c_front), 1.0)
    paint(base, poly_mask(top), solid(*rgb255(hsv(it["hue"], 0.24, 0.92))), 1.0)
    paint(base, poly_mask(side), solid(*rgb255(hsv(it["hue"], 0.36, 0.6))), 1.0)
    for pts in ([(560, 780), (1040, 780)], [(1040, 780), (1040, 1250)],
                [(560, 780), (560, 1250)], [(1040, 780), (1110, 712)],
                [(560, 780), (630, 712)], [(1040, 1250), (1110, 1182)]):
        ln = Image.new("L", (S, S), 0)
        ImageDraw.Draw(ln).line(pts, fill=255, width=5)
        paint(base, np.array(ln).astype(np.float32), solid(20, 25, 60), 0.25)
    tl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(tl)
    d.rectangle([604, 824, 996, 1206], outline=(255, 255, 255, 90), width=4)
    ctext(d, 803, 896, "SPM", F("DejaVuSans-Bold.ttf", 118), (18, 28, 58, 120))
    ctext(d, 800, 892, "SPM", F("DejaVuSans-Bold.ttf", 118), (243, 247, 252, 255))
    ctext(d, 800, 1052, item_short_spaced(it), F("DejaVuSans-Bold.ttf", 52), (243, 247, 252, 255), tracking=16)
    ctext(d, 800, 1130, "издание роскошное", F("DejaVuSans-Oblique.ttf", 30), (243, 247, 252, 200))
    base.alpha_composite(tl)
    hhilite(base, 640, 1100, 718, 16, 0.18, blur=6)


def item_short_spaced(it):
    return it["short"]


RENDERERS = {
    "flacon": (obj_flacon, [(800, 1256, 150, 26, 0.30)]),
    "ampoule": (obj_ampoule, [(800, 1256, 160, 26, 0.30)]),
    "syringe": (obj_syringe, [(790, 1004, 430, 34, 0.20),
                              (275, 1000, 130, 8, 0.15),
                              (200, 962, 60, 5, 0.12),
                              (1100, 1000, 110, 12, 0.15)], 1006, 0.20),
    "tube": (obj_tube, [(800, 1256, 130, 22, 0.30)]),
    "jar": (obj_jar, [(800, 1256, 220, 30, 0.32)]),
    "inhaler": (obj_inhaler, [(800, 1256, 110, 20, 0.30)]),
    "capsule": (obj_capsule, [(690, 1098, 270, 34, 0.20), (935, 1178, 270, 34, 0.22)], 1160, 0.20),
    "spray": (obj_spray, [(800, 1256, 140, 24, 0.30), (1050, 1256, 90, 18, 0.22)]),
    "patch": (obj_patch, [(800, 1152, 350, 42, 0.20)], 1180, 0.22),
    "bottle": (obj_bottle, [(800, 1256, 150, 26, 0.30)]),
    "vial": (obj_vial, [(800, 1098, 300, 26, 0.25)] + [(c, 1256, 58, 12, 0.28) for c in (640, 760, 880, 1000, 1120)]),
    "box": (obj_box, [(830, 1256, 300, 40, 0.32)], 1252, 0.22),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for it in PRODUCTS:
        fn, shadows = RENDERERS[it["art"]][0], RENDERERS[it["art"]][1]
        refl_y = RENDERERS[it["art"]][2] if len(RENDERERS[it["art"]]) > 2 else FLOOR_Y
        refl_s = RENDERERS[it["art"]][3] if len(RENDERERS[it["art"]]) > 3 else 0.13
        img = compose(fn, it, shadows, refl_y, refl_s)
        path = os.path.join(OUT, it["id"] + ".png")
        img.save(path, optimize=True)
        webp = os.path.join(OUT, it["id"] + ".webp")
        img.save(webp, "WEBP", quality=92, method=6)
        print(f"{it['id']:24s} -> {path} ({os.path.getsize(path) // 1024} KB), "
              f"{webp} ({os.path.getsize(webp) // 1024} KB)")


if __name__ == "__main__":
    main()
