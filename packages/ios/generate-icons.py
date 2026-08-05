#!/usr/bin/env python3
"""Generate 1024x1024 app icon PNGs for Anemos.

Draws the pixel-art "Gust-A" mark at 2x scale (512→1024) using Pillow.
No SVG rasterizer needed — all shapes are axis-aligned rectangles.
"""

from PIL import Image, ImageDraw

SCALE = 2  # 512 → 1024

# Gust-A letter rectangles at 512×512 coordinates: (x1, y1, x2, y2)
# 8px grid cells, 3-cell stroke. The A body sits slightly left of center so
# the combined A+gust glyph is optically centered; the crossbar trails
# rightward into 3 staggered wind streaks of decreasing length.
GUST_A_RECTS = [
    (144, 72, 296, 96),    # Apex cap
    (144, 96, 168, 144),   # Left leg, step 1
    (136, 144, 160, 192),  # Left leg, step 2
    (128, 192, 152, 240),  # Left leg, step 3
    (120, 240, 144, 288),  # Left leg, step 4
    (112, 288, 136, 336),  # Left leg, step 5
    (104, 336, 128, 384),  # Left leg, step 6
    (96, 384, 120, 448),   # Left leg, step 7
    (272, 96, 296, 144),   # Right leg, step 1
    (280, 144, 304, 192),  # Right leg, step 2
    (288, 192, 312, 240),  # Right leg, step 3
    (296, 240, 320, 288),  # Right leg, step 4
    (304, 288, 328, 336),  # Right leg, step 5
    (312, 336, 336, 384),  # Right leg, step 6
    (320, 384, 344, 448),  # Right leg, step 7
    (120, 272, 320, 296),  # Crossbar
    (88, 416, 120, 448),   # Left foot
    (320, 416, 352, 448),  # Right foot
    (320, 280, 432, 304),  # Wind streak, long
    (320, 272, 392, 296),  # Wind streak, medium
    (320, 264, 360, 288),  # Wind streak, short
]

# Shadow rectangle (below the crossbar, between the legs)
SHADOW_RECT = (152, 296, 272, 320)


def scaled(rect):
    """Scale a rect tuple by SCALE factor."""
    return tuple(v * SCALE for v in rect)


def draw_icon(bg_color, letter_color, shadow_color, transparent_bg=False):
    """Draw the Gust-A icon and return a PIL Image."""
    size = 512 * SCALE
    if transparent_bg:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw shadow first (behind the letter)
    if shadow_color:
        x1, y1, x2, y2 = scaled(SHADOW_RECT)
        draw.rectangle([x1, y1, x2 - 1, y2 - 1], fill=shadow_color)

    # Draw letter rectangles
    for rect in GUST_A_RECTS:
        x1, y1, x2, y2 = scaled(rect)
        draw.rectangle([x1, y1, x2 - 1, y2 - 1], fill=letter_color)

    return img


def write_contents_json(out_dir):
    """Write the asset catalog Contents.json for the AppIcon set."""
    import json
    import os

    contents = {
        "images": [
            {
                "filename": "AppIcon-light.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            },
            {
                "appearances": [{"appearance": "luminosity", "value": "dark"}],
                "filename": "AppIcon-dark.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            },
            {
                "appearances": [{"appearance": "luminosity", "value": "tinted"}],
                "filename": "AppIcon-tinted.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            },
        ],
        "info": {"author": "xcode", "version": 1},
    }

    path = os.path.join(out_dir, "Contents.json")
    with open(path, "w") as f:
        json.dump(contents, f, indent=2)
        f.write("\n")


def main():
    import os

    out_dir = os.path.join(
        os.path.dirname(__file__),
        "OpenCode", "OpenCode", "Assets.xcassets",
        "AppIcon.appiconset",
    )
    os.makedirs(out_dir, exist_ok=True)

    # Light appearance (default): light bg, dark letter
    light = draw_icon(
        bg_color="#FDFCFC",
        letter_color="#17181C",
        shadow_color="#E6E5E6",
    )
    light.save(os.path.join(out_dir, "AppIcon-light.png"))
    print(f"Saved AppIcon-light.png ({light.size[0]}x{light.size[1]})")

    # Dark appearance: dark bg, white letter
    dark = draw_icon(
        bg_color="#131010",
        letter_color="#FFFFFF",
        shadow_color="#5A5858",
    )
    dark.save(os.path.join(out_dir, "AppIcon-dark.png"))
    print(f"Saved AppIcon-dark.png ({dark.size[0]}x{dark.size[1]})")

    # Tinted appearance: transparent bg, white letter silhouette
    tinted = draw_icon(
        bg_color=None,
        letter_color="#FFFFFF",
        shadow_color=None,
        transparent_bg=True,
    )
    tinted.save(os.path.join(out_dir, "AppIcon-tinted.png"))
    print(f"Saved AppIcon-tinted.png ({tinted.size[0]}x{tinted.size[1]})")

    write_contents_json(out_dir)
    print("Saved Contents.json")


if __name__ == "__main__":
    main()
