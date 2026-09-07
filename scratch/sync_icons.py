import base64
import os
import shutil

# Read 512x512 PNG
with open('frontend/icon-512.png', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#111216"/>
  <image href="data:image/png;base64,{b64_data}" x="0" y="0" width="512" height="512"/>
</svg>'''

with open('frontend/icon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# Copy favicons and icons to root as well
root_files = [
    'favicon.ico',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png',
    'icon.svg'
]

for rf in root_files:
    src = os.path.join('frontend', rf)
    if os.path.exists(src):
        shutil.copy2(src, rf)

print("SUCCESS: icon.svg and root favicons synced!")
