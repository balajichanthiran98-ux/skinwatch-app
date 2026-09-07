import os
from PIL import Image, ImageOps

source_path = r'C:\Users\balaj\.gemini\antigravity-ide\brain\f47fcc61-f97a-4fec-944f-06b40cc0697d\.user_uploaded\media_1788791447991.png'
frontend_dir = r'c:\Users\balaj\Downloads\files1\skinwatch-app\frontend'
assets_dir = os.path.join(frontend_dir, 'assets')
os.makedirs(assets_dir, exist_ok=True)

img = Image.open(source_path).convert('RGBA')
w, h = img.size

# Square crop around center (512, 279) of size 558x558
crop_box = (512 - 279, 0, 512 + 279, 558)
square_img = img.crop(crop_box)

# Background color sampled from edge
bg_color = (17, 18, 22, 255)

# 1. Standard Square Icons (Full Bleed)
def create_standard_icon(size):
    resized = square_img.resize((size, size), Image.Resampling.LANCZOS)
    return resized

# 2. Maskable Icons (With 12% safe-zone margin on #111216 background)
def create_maskable_icon(size):
    canvas = Image.new('RGBA', (size, size), bg_color)
    inner_size = int(size * 0.82)
    inner_resized = square_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (size - inner_size) // 2
    canvas.paste(inner_resized, (offset, offset), inner_resized)
    return canvas

# Save regular icons
icon_512 = create_standard_icon(512)
icon_512.save(os.path.join(frontend_dir, 'icon-512.png'), 'PNG', optimize=True)

icon_192 = create_standard_icon(192)
icon_192.save(os.path.join(frontend_dir, 'icon-192.png'), 'PNG', optimize=True)

apple_touch = create_standard_icon(180)
apple_touch.save(os.path.join(frontend_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)

# Save maskable icons
maskable_512 = create_maskable_icon(512)
maskable_512.save(os.path.join(frontend_dir, 'icon-maskable-512.png'), 'PNG', optimize=True)

maskable_192 = create_maskable_icon(192)
maskable_192.save(os.path.join(frontend_dir, 'icon-maskable-192.png'), 'PNG', optimize=True)

# Save favicon PNGs
fav_32 = create_standard_icon(32)
fav_32.save(os.path.join(frontend_dir, 'favicon-32x32.png'), 'PNG', optimize=True)

fav_16 = create_standard_icon(16)
fav_16.save(os.path.join(frontend_dir, 'favicon-16x16.png'), 'PNG', optimize=True)

# Save favicon.ico (multi-res)
icon_512.save(
    os.path.join(frontend_dir, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)

# Save assets logo
icon_512.save(os.path.join(assets_dir, 'logo.png'), 'PNG', optimize=True)
icon_512.save(os.path.join(assets_dir, 'skinwatch-logo.png'), 'PNG', optimize=True)

print("✓ All PWA icons, maskables, apple-touch, and favicons successfully created!")
