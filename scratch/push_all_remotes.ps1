$gitExe = 'C:\Users\balaj\AppData\Local\OpenClaw\deps\portable-git\mingw64\bin\git.exe'

Set-Location "c:\Users\balaj\Downloads\files1\skinwatch-app"

Write-Host "--- 1. Staging all files ---"
& $gitExe add -A

Write-Host "--- 2. Checking Status ---"
& $gitExe status

& $gitExe commit -m "feat: pinpoint exact village reverse geocoding, Google Maps address formatting, and multi-device location sync" 2>$null

Write-Host "--- 4. Push to remote skinwatch-app. ---"
& $gitExe remote set-url origin "https://github.com/balajichanthiran98-ux/skinwatch-app."
& $gitExe push -u origin main --force

Write-Host "--- 5. Push to remote skinwatch-app (without dot) ---"
& $gitExe remote set-url origin "https://github.com/balajichanthiran98-ux/skinwatch-app.git"
& $gitExe push -u origin main --force

Write-Host "--- 6. Latest Commit Log ---"
& $gitExe log -n 2 --oneline
