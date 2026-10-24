#!/usr/bin/env python3
"""
Генератор фотореалистичных студийных фото товаров SPM Pharmacy через локальную
AI-модель Stable Diffusion (SD 1.5-семейство, напр. Lykon/dreamshaper-8) на CPU.

Гибридный пайплайн на каждый товар:
  1. AI генерирует фотореалистичную основу (стекло, жидкость, тени, блики).
  2. Постпроцесс: баланс белого, авто-обрезка по объекту, белый студийный холст
     800×800, лёгкая виньетка, микрорезкость.
  3. Поверх вклеивается читаемая этикетка SPM (текст + штрихкод) — AI не умеет
     рисовать читаемый текст, этикетка пририсовывается программно с лёгкой
     перспективой и тенью.
  4. Лёгкий слой frutiger aero: капли росы и блики на этикетке.

Запуск:
    pip install torch diffusers transformers accelerate safetensors pillow numpy matplotlib
    python3 tools/generate_ai_products.py                     # все 12 товаров
    python3 tools/generate_ai_products.py rosinka-09          # один товар
    python3 tools/generate_ai_products.py --steps 30 --force  # перегенерировать

Модель скачивается один раз в ~/.cache/huggingface (~3.9 GB для dreamshaper-8).
SDXL под лимитом памяти 4 GB не помещается (UNet ~10 GB fp32), поэтому SD 1.5.
На CPU один кадр 768×768 за 25 шагов занимает ~5–6 минут (5 ядер).

Выход: assets/products/<id>.png + <id>.webp (800×800; WebP quality 92) — сайт
отдаёт WebP через <picture>, PNG остаётся fallback. Без torch/diffusers сайт
продолжает работать на прежних PNG-рендерах (или на SVG-fallback).
"""

import argparse
import hashlib
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "products")

sys.path.insert(0, os.path.join(HERE, "ai_prompts"))
from products import PRODUCTS, NEGATIVE, full_prompt  # noqa: E402

GEN = 768    # размер генерации AI
SIZE = 800   # итоговый размер кадра (как у текущих PNG)
STEPS = 25
GUIDANCE = 7.5
SEED = 20241024
DEFAULT_MODEL = "Lykon/dreamshaper-8"

BRAND = (39, 66, 148)       # #274294 — синий SPM
INK = (29, 58, 82)          # тёмно-синий текст
GRAY = (95, 112, 125)       # дозировка
AQUA1 = (110, 205, 228)     # градиент этикетки, тёмный край
AQUA2 = (198, 240, 248)     # градиент этикетки, светлый край
LABEL_BG = (251, 253, 255)
LABEL_EDGE = (205, 222, 234)

import matplotlib  # noqa: E402
FDIR = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf")
_FONT_CACHE = {}


def F(name, size):
    key = (name, size)
    if key not in _FONT_CACHE:
        _FONT_CACHE[key] = ImageFont.truetype(os.path.join(FDIR, name), size)
    return _FONT_CACHE[key]


def pid_seed(product_id, base):
    h = hashlib.md5(product_id.encode("utf-8")).digest()
    return base + int.from_bytes(h[:4], "big") % 100000


# ---------------------------------------------------------------- постпроцесс

def postprocess(img: Image.Image) -> Image.Image:
    """Баланс белого, авто-обрезка, белый холст 800×800, виньетка, резкость."""
    arr = np.array(img.convert("RGB")).astype(np.float32)
    bright = arr[arr.sum(axis=2) > 720]
    if len(bright) > 500:
        wb = bright.mean(axis=0)
        scale = np.clip(255.0 / np.maximum(wb, 1), 0.96, 1.04)
        arr = arr * scale[None, None, :]
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    g = np.array(img.convert("L")).astype(np.float32)
    mask = g < 238
    if mask.sum() > 1000:
        ys, xs = np.where(mask)
        x0, x1 = xs.min(), xs.max()
        y0, y1 = ys.min(), ys.max()
        pad_x = int((x1 - x0) * 0.06)
        pad_y = int((y1 - y0) * 0.06)
        x0 = max(0, x0 - pad_x); x1 = min(img.width, x1 + pad_x)
        y0 = max(0, y0 - pad_y); y1 = min(img.height, y1 + pad_y)
        img = img.crop((x0, y0, x1, y1))
    img = img.convert("RGB")
    canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    scale = min((SIZE * 0.86) / img.width, (SIZE * 0.90) / img.height)
    nw, nh = max(1, int(img.width * scale)), max(1, int(img.height * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (SIZE - nw) // 2
    oy = int((SIZE - nh) * 0.46)
    canvas.paste(img, (ox, oy))
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    r = np.sqrt((xx - SIZE / 2) ** 2 + (yy - SIZE * 0.42) ** 2) / (SIZE * 0.62)
    vig = 1.0 - np.clip((r - 0.72) / 0.28, 0, 1) * 0.10
    ca = np.array(canvas).astype(np.float32) * vig[..., None]
    canvas = Image.fromarray(np.clip(ca, 0, 255).astype(np.uint8))
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    canvas = ImageEnhance.Contrast(canvas).enhance(1.04)
    return canvas


# ---------------------------------------------------------------- этикетка

def _quad_coeffs(quad, lw, lh):
    """Коэффициенты перспективного преобразования: выход (quad в патче) -> вход (0..lw, 0..lh)."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    src = np.array([[0, 0], [lw, 0], [lw, lh], [0, lh]], dtype=np.float64)
    dst = np.array([(x0, y0), (x1, y1), (x2, y2), (x3, y3)], dtype=np.float64)
    A = []
    b = []
    for (X, Y), (x, y) in zip(dst, src):
        A.append([X, Y, 1, 0, 0, 0, -x * X, -x * Y])
        b.append(x)
        A.append([0, 0, 0, X, Y, 1, -y * X, -y * Y])
        b.append(y)
    return np.linalg.solve(np.array(A), np.array(b))


def _fit_font(draw, text, font_name, start_size, max_width, min_size=10):
    size = start_size
    while size > min_size:
        f = F(font_name, size)
        if draw.textlength(text, font=f) <= max_width:
            return f
        size -= 1
    return F(font_name, min_size)


def _barcode(draw, x0, y0, w, h, seed_bytes):
    """Псевдослучайный штрихкод: ширины полос из md5(id)."""
    rng = np.random.default_rng(int.from_bytes(seed_bytes[:8], "big"))
    x = x0
    bars = []
    while x < x0 + w:
        bw = int(rng.integers(1, 4))
        bars.append((x, bw))
        x += bw + int(rng.integers(1, 3))
    for bx, bw in bars:
        if bx + bw <= x0 + w:
            draw.rectangle([bx, y0, bx + bw - 1, y0 + h], fill=INK + (255,))
    return bars


def draw_label_layer(product, lw, lh):
    """Содержимое этикетки (RGBA, размер lw×lh, рисуется в 2x и даунскейлится)."""
    SS = 2
    W, H = lw * SS, lh * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = max(6, int(min(W, H) * 0.045))
    # фон + рамка
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=r, fill=LABEL_BG + (255,),
                        outline=LABEL_EDGE + (255,), width=max(1, SS))
    # аква-полоса с SPM
    band_h = int(H * 0.20)
    band = Image.new("RGBA", (W, band_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for i in range(band_h):
        t = i / max(1, band_h - 1)
        c = tuple(int(AQUA1[k] + (AQUA2[k] - AQUA1[k]) * t) for k in range(3))
        bd.line([(0, i), (W, i)], fill=c + (255,))
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, W - 1, H - 1], radius=r, fill=255)
    layer.alpha_composite(band, (0, 0))
    spm = _fit_font(d, "SPM", "DejaVuSans-Bold.ttf", int(band_h * 0.62), int(W * 0.8))
    tw = d.textlength("SPM", font=spm)
    d.text(((W - tw) / 2, (band_h - spm.size * 0.95) / 2 - 2), "SPM", font=spm, fill=(255, 255, 255, 255))
    # название и дозировка
    cy = band_h + int(H * 0.075)
    name = _fit_font(d, product["short"], "DejaVuSans-Bold.ttf", int(H * 0.155), int(W * 0.88))
    tw = d.textlength(product["short"], font=name)
    d.text(((W - tw) / 2, cy), product["short"], font=name, fill=INK + (255,))
    cy += int(name.size * 1.25)
    dose = _fit_font(d, product["dose"], "DejaVuSans.ttf", int(H * 0.115), int(W * 0.8))
    tw = d.textlength(product["dose"], font=dose)
    d.text(((W - tw) / 2, cy), product["dose"], font=dose, fill=GRAY + (255,))
    # разделитель
    ly = int(H * 0.66)
    d.line([(int(W * 0.08), ly), (int(W * 0.92), ly)], fill=LABEL_EDGE + (255,), width=max(1, SS))
    # штрихкод + цифры
    bc_h = int(H * 0.17)
    bc_y = ly + int(H * 0.045)
    bc_w = int(W * 0.62)
    _barcode(d, (W - bc_w) // 2, bc_y, bc_w, bc_h, hashlib.md5(product["id"].encode()).digest())
    digits = "8 40012 00009 7"
    mono = F("DejaVuSansMono.ttf", max(8, int(H * 0.065)))
    tw = d.textlength(digits, font=mono)
    d.text(((W - tw) / 2, bc_y + bc_h + int(H * 0.02)), digits, font=mono, fill=(60, 70, 80, 255))
    # глянцевый блик (диагональная светлая полоса)
    gloss = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.polygon([(0, 0), (int(W * 0.55), 0), (int(W * 0.15), H), (0, H)], fill=(255, 255, 255, 26))
    layer.alpha_composite(gloss)
    # клип по скруглённому прямоугольнику
    layer.putalpha(Image.composite(layer.split()[3], Image.new("L", (W, H), 0), mask))
    return layer.resize((lw, lh), Image.Resampling.LANCZOS)


def _label_geometry(product):
    """Геометрия этикетки в координатах итогового кадра SIZE×SIZE -> (quad в px, lw, lh)."""
    spec = product["label"]
    kind = spec[0]
    if kind == "rect":
        _, cx, cy, w, h = spec
        x0, y0 = (cx - w / 2) * SIZE, (cy - h / 2) * SIZE
        x1, y1 = (cx + w / 2) * SIZE, (cy + h / 2) * SIZE
        quad = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        return quad, int(round(x1 - x0)), int(round(y1 - y0))
    _, p0, p1, p2, p3 = spec
    quad = [tuple(v * SIZE for v in p) for p in (p0, p1, p2, p3)]
    xs = [p[0] for p in quad]; ys = [p[1] for p in quad]
    lw = int(round(max(np.hypot(p1[0] - p0[0], p1[1] - p0[1]), np.hypot(p2[0] - p3[0], p2[1] - p3[1]))))
    lh = int(round(max(np.hypot(p3[0] - p0[0], p3[1] - p0[1]), np.hypot(p2[0] - p1[0], p2[1] - p1[1]))))
    return quad, max(40, lw), max(40, lh)


def paste_label(img: Image.Image, product) -> Image.Image:
    """Вклеивает читаемую этикетку SPM с тенью и лёгкой перспективой."""
    quad, lw, lh = _label_geometry(product)
    xs = [p[0] for p in quad]; ys = [p[1] for p in quad]
    bx0, by0 = int(min(xs)), int(min(ys))
    bw, bh = int(max(xs)) - bx0 + 1, int(max(ys)) - by0 + 1
    lquad = [(p[0] - bx0, p[1] - by0) for p in quad]
    # тень: тот же четырёхугольник, сдвиг + тень, рисуется как filled polygon
    shadow = Image.new("RGBA", (bw + 24, bh + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon([(p[0] + 6 - bx0 + 8, p[1] + 10 - by0 + 8) for p in quad], fill=(20, 40, 60, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    img.paste(shadow, (bx0 - 8, by0 - 8), shadow)
    # сама этикетка: слой 2x -> перспективный warp в четырёхугольник
    layer = draw_label_layer(product, lw * 2, lh * 2)
    coeffs = _quad_coeffs(lquad, lw * 2, lh * 2)
    warped = layer.transform((bw, bh), Image.PERSPECTIVE, coeffs.tolist(), Image.Resampling.BICUBIC)
    img.paste(warped, (bx0, by0), warped)
    return img, (bx0, by0, bw, bh)


# ---------------------------------------------------------------- aero glaze

def _dew_drop(img, cx, cy, r, tint=(170, 225, 242)):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tint + (70,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 160), width=max(1, int(r * 0.12)))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=20, end=160, fill=(30, 80, 110, 90), width=max(1, int(r * 0.14)))
    hr = r * 0.28
    d.ellipse([cx - r * 0.45 - hr, cy - r * 0.5 - hr, cx - r * 0.45 + hr, cy - r * 0.5 + hr],
              fill=(255, 255, 255, 230))
    d.ellipse([cx + r * 0.3, cy + r * 0.35, cx + r * 0.42, cy + r * 0.47], fill=(255, 255, 255, 120))
    img.alpha_composite(layer)


def _sparkle(img, cx, cy, r):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for w, h in ((r * 0.16, r), (r, r * 0.16)):
        d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=(255, 255, 255, 210))
    d.ellipse([cx - r * 0.1, cy - r * 0.1, cx + r * 0.1, cy + r * 0.1], fill=(255, 255, 255, 255))
    bloom = layer.filter(ImageFilter.GaussianBlur(max(1, r * 0.2)))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(bloom)
    out.alpha_composite(layer)
    img.alpha_composite(out)


def aero_glaze(img: Image.Image, product) -> Image.Image:
    """Лёгкий frutiger aero слой: капли росы и блики на этикетке (этикетка = ориентир на объекте)."""
    if not product.get("label"):
        return img
    img = img.convert("RGBA")
    _, (bx, by, bw, bh) = None, paste_label_geometry_only(product)
    rng = np.random.default_rng(pid_seed(product["id"], 7))
    spots = [(0.90, 0.12, 0.075), (0.10, 0.62, 0.055), (0.52, -0.05, 0.05)]
    for fx, fy, fr in spots:
        _dew_drop(img, bx + bw * fx, by + bh * fy, max(4.0, bw * fr))
    _sparkle(img, bx + bw * 0.97, by - bh * 0.06, max(6.0, bw * 0.06))
    _sparkle(img, bx + bw * 0.03, by + bh * 0.9, max(4.0, bw * 0.045))
    return img.convert("RGB")


def paste_label_geometry_only(product):
    quad, lw, lh = _label_geometry(product)
    xs = [p[0] for p in quad]; ys = [p[1] for p in quad]
    return int(min(xs)), int(min(ys)), int(max(xs)) - int(min(xs)) + 1, int(max(ys)) - int(min(ys)) + 1


# ---------------------------------------------------------------- генерация

def generate_one(pipe, product, out_path, raw_dir=None, use_label=True):
    import torch
    gen = torch.Generator(device="cpu").manual_seed(pid_seed(product["id"], SEED))
    img = pipe(
        prompt=full_prompt(product),
        negative_prompt=NEGATIVE,
        num_inference_steps=STEPS,
        guidance_scale=GUIDANCE,
        width=GEN,
        height=GEN,
        generator=gen,
    ).images[0]
    if raw_dir:
        os.makedirs(raw_dir, exist_ok=True)
        img.save(os.path.join(raw_dir, product["id"] + ".png"))
    img = postprocess(img)
    if use_label and product.get("label"):
        img, _ = paste_label(img, product)
        img = aero_glaze(img, product)
    tmp = out_path + ".tmp.png"
    img.save(tmp, optimize=True)
    os.replace(tmp, out_path)
    webp_path = out_path[:-4] + ".webp"
    img.save(webp_path, "WEBP", quality=92, method=6)
    print(f"  -> {out_path} ({os.path.getsize(out_path) // 1024} KB), "
          f"{webp_path} ({os.path.getsize(webp_path) // 1024} KB)")


def main():
    global STEPS
    ap = argparse.ArgumentParser(description="AI-фото товаров SPM Pharmacy (локальный SD на CPU)")
    ap.add_argument("ids", nargs="*", help="id товаров (по умолчанию все 12)")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--steps", type=int, default=STEPS)
    ap.add_argument("--out-dir", default=OUT)
    ap.add_argument("--raw", action="store_true", help="сохранить сырой вывод AI рядом (./raw-ai/)")
    ap.add_argument("--no-label", action="store_true", help="не вклеивать этикетку (отладка)")
    ap.add_argument("--force", action="store_true", help="перегенерировать существующие файлы")
    args = ap.parse_args()
    STEPS = args.steps

    selected = [p for p in PRODUCTS if not args.ids or p["id"] in args.ids]
    if not selected:
        print("Не найдено товаров с такими id:", args.ids)
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)
    raw_dir = os.path.join(ROOT, "raw-ai") if args.raw else None

    print(f"Модель: {args.model}")
    print(f"Шаги: {STEPS}, размер генерации: {GEN}, выход: {SIZE}")
    try:
        import torch
        from diffusers import StableDiffusionPipeline
    except ImportError as e:
        print(f"Нет зависимостей: {e}")
        print("Установи: pip install torch diffusers transformers accelerate safetensors")
        sys.exit(1)

    print("Загружаю модель (первый запуск качает ~3.9 GB в ~/.cache/huggingface)...")
    try:
        pipe = StableDiffusionPipeline.from_pretrained(
            args.model,
            torch_dtype=torch.float32,
            safety_checker=None,
            requires_safety_checker=False,
        )
    except Exception as e:
        print(f"Не удалось загрузить модель: {e}")
        print("Проверь сеть и свободное место (~4 GB в ~/.cache/huggingface).")
        sys.exit(1)
    pipe.to("cpu")
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass
    pipe.set_progress_bar_config(disable=True)

    done = skipped = failed = 0
    for p in selected:
        out = os.path.join(args.out_dir, p["id"] + ".png")
        if os.path.exists(out) and not args.force:
            print(f"[{p['id']}] уже существует, пропускаю (--force, чтобы перегенерировать)")
            skipped += 1
            continue
        t0 = time.time()
        print(f"[{p['id']}] генерирую ({STEPS} шагов, CPU ~5–6 мин)...")
        try:
            generate_one(pipe, p, out, raw_dir=raw_dir, use_label=not args.no_label)
            done += 1
            print(f"[{p['id']}] готово за {time.time() - t0:.0f} с")
        except Exception as e:
            failed += 1
            print(f"  ОШИБКА для {p['id']}: {e}")
    print(f"\nГотово: {done}, пропущено: {skipped}, ошибок: {failed}")


if __name__ == "__main__":
    main()
