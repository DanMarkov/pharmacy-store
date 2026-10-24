#!/usr/bin/env python3
"""
Промпты и параметры этикеток для AI-генерации фотореалистичных студийных фото
товаров SPM Pharmacy. Используется с tools/generate_ai_products.py
(Stable Diffusion 1.5-семейство, напр. Lykon/dreamshaper-8, локально на CPU).

Ограничение CLIP: промпт обрезается на 77 токенов, поэтому промпт короткий:
объект + этикетка (латиницей) + хвост со студийным стилем. Кириллический текст
этикетки дорисовывается в постпроцессе (AI всё равно не читает длинный текст).

Поля товара:
  id     — имя файла <id>.png
  short  — краткое название на этикетке (как в data.js, кириллица)
  dose   — дозировка на этикетке (как в data.js)
  hue    — фирменный оттенок (для fallback-рендера)
  prompt — англоязычный промпт (объект + label spec)
  label  — None (этикетка не клеится: kapsula, plastyr)
           ("rect", cx, cy, w, h) — прямоугольник, центр и размеры в долях
                                      от итогового кадра 800×800
           ("quad", p0, p1, p2, p3) — четырёхугольник под перспективу
                                      (p0=верх-лево, p1=верх-право, p2=низ-право, p3=низ-лево)
"""

STYLE_TAIL = (
    "studio product photo, white background, softbox light, contact shadow, "
    "glossy reflection, photorealistic, 8k, dew drops, soft aqua rim light"
)

NEGATIVE = (
    "cartoon, illustration, 3d render, cgi, anime, toy, plastic, oversaturated, neon, "
    "gradient background, watermark, signature, blurry, deformed, ugly, duplicate, "
    "cropped, low quality, cluttered, hands, person, landscape, text"
)

PRODUCTS = [
    dict(
        id="rosinka-09",
        short="РОСА №09",
        dose="90 мл",
        hue=205,
        prompt=(
            "amber glass spray bottle 80ml, black ribbed screw cap, blue liquid inside, "
            "white label with blue text ROSA 09 and barcode, dew drops on glass"
        ),
        label=("rect", 0.50, 0.60, 0.26, 0.20),
    ),
    dict(
        id="ampula-tuman",
        short="ТУМАН",
        dose="2 мл",
        hue=190,
        prompt=(
            "glass ampoule 2ml standing upright, clear borosilicate glass, pale turquoise "
            "liquid, white wrap label with blue text TUMAN, meniscus, tiny bubbles in liquid"
        ),
        label=("rect", 0.50, 0.56, 0.15, 0.30),
    ),
    dict(
        id="shpric-gorizont",
        short="ГОРИЗОНТ",
        dose="5 мл",
        hue=160,
        prompt=(
            "top-down flat lay product photo of a single 5ml disposable syringe with "
            "needle, lying straight horizontal on pure white background, clear barrel "
            "with black graduation marks, green liquid inside, blue plunger, "
            "orthographic view, centered, isolated on white"
        ),
        label=("rect", 0.50, 0.50, 0.40, 0.09),
    ),
    dict(
        id="maz-poliklinika",
        short="ПОЛИКЛИНИКА",
        dose="40 г",
        hue=45,
        prompt=(
            "ointment tube 40g standing on white screw cap, crimped seal at top, "
            "white tube with cream-yellow accents, label with blue text POLIKLINIKA and barcode"
        ),
        label=("rect", 0.50, 0.46, 0.30, 0.28),
    ),
    dict(
        id="banka-dushi",
        short="ДУШИ",
        dose="250 мл",
        hue=280,
        prompt=(
            "glass jar 250ml with purple screw lid, lavender cream inside visible through "
            "thick glass walls, white label with blue text DUSHI and barcode"
        ),
        label=("rect", 0.50, 0.62, 0.38, 0.22),
    ),
    dict(
        id="ingalyator-veter",
        short="ВЕТЕР",
        dose="120 вдохов",
        hue=140,
        prompt=(
            "metered dose inhaler standing upright, white plastic body with green accent "
            "stripe, mouthpiece cap, dose counter window, label with blue text VETER and barcode"
        ),
        label=("rect", 0.50, 0.56, 0.24, 0.26),
    ),
    dict(
        id="kapsula-zabvenie",
        short="ЗАБВЕНИЕ",
        dose="1 капс.",
        hue=330,
        prompt=(
            "two pharmaceutical capsules on white surface at slight angle, one half magenta "
            "one half cream, glossy gelatin shell, macro product shot, water droplet on capsule"
        ),
        label=None,
    ),
    dict(
        id="sprey-dozhd",
        short="ДОЖДЬ",
        dose="200 мл",
        hue=220,
        prompt=(
            "nasal spray bottle 200ml, frosted translucent plastic, blue metallic pump "
            "sprayer, clear cap beside it, white label with blue text DOZHD and barcode, dew drops"
        ),
        label=("rect", 0.50, 0.60, 0.30, 0.22),
    ),
    dict(
        id="plastyr-mechta",
        short="МЕЧТА",
        dose="1 шт.",
        hue=25,
        prompt=(
            "adhesive bandage plaster flat on white surface at slight angle, skin-tone beige "
            "strip, square gauze pad in center, macro product photo, soft shadow"
        ),
        label=None,
    ),
    dict(
        id="f\u043bakon-utro",
        short="УТРО",
        dose="200 мл",
        hue=75,
        prompt=(
            "single green glass medicine bottle 200ml with green screw cap, pale yellow "
            "liquid inside, meniscus visible, standing upright centered on white background, "
            "soft shadow, product photography, isolated, no other objects"
        ),
        label=("rect", 0.50, 0.60, 0.32, 0.22),
    ),
    dict(
        id="kartochka-sluchainoe",
        short="СЛАСТЬЕ",
        dose="5 × 1 мл",
        hue=300,
        prompt=(
            "white cardboard box open viewed from above at slight angle, five small glass "
            "vials 1ml inside with magenta caps and pink liquid, box printed with blue text SLASTYE"
        ),
        label=("rect", 0.50, 0.64, 0.46, 0.13),
    ),
    dict(
        id="korobka-tishina",
        short="ТИШИНА",
        dose="1 кор.",
        hue=250,
        prompt=(
            "elegant rigid cardboard box, deep blue-violet matte finish, white foil text "
            "TISHINA on front face, three-quarter angle view, embossed border, luxury packaging"
        ),
        label=("quad", (0.36, 0.42), (0.60, 0.38), (0.64, 0.62), (0.32, 0.66)),
    ),
]


def full_prompt(p):
    return f"{p['prompt']}, {STYLE_TAIL}"


if __name__ == "__main__":
    for p in PRODUCTS:
        fp = full_prompt(p)
        print(f"== {p['id']} == ({len(fp.split())} слов)")
        print(fp)
        print(f"   label: {p['label']}")
        print()
