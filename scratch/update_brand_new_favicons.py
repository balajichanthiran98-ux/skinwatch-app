import base64
import os
import shutil

frontend_dir = r'c:\Users\balaj\Downloads\files1\skinwatch-app\frontend'
root_dir = r'c:\Users\balaj\Downloads\files1\skinwatch-app'

# Generate fresh distinct files
shutil.copy2(os.path.join(frontend_dir, 'icon-192.png'), os.path.join(frontend_dir, 'skinwatch-icon-192.png'))
shutil.copy2(os.path.join(frontend_dir, 'icon-512.png'), os.path.join(frontend_dir, 'skinwatch-icon-512.png'))
shutil.copy2(os.path.join(frontend_dir, 'icon-maskable-512.png'), os.path.join(frontend_dir, 'skinwatch-icon-maskable-512.png'))
shutil.copy2(os.path.join(frontend_dir, 'favicon.ico'), os.path.join(frontend_dir, 'skinwatch-favicon.ico'))
shutil.copy2(os.path.join(frontend_dir, 'favicon-32x32.png'), os.path.join(frontend_dir, 'skinwatch-favicon-32x32.png'))

# Base64 representations
with open(os.path.join(frontend_dir, 'favicon-32x32.png'), 'rb') as f:
    b64_32 = base64.b64encode(f.read()).decode('utf-8')

with open(os.path.join(frontend_dir, 'icon-192.png'), 'rb') as f:
    b64_192 = base64.b64encode(f.read()).decode('utf-8')

print("B64_32_LEN:", len(b64_32))
print("B64_192_LEN:", len(b64_192))

with open('scratch/b64_icons.json', 'w') as f:
    import json
    json.dump({'b64_32': b64_32, 'b64_192': b64_192}, f)

print("SUCCESS")
