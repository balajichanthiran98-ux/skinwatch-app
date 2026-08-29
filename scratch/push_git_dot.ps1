$gitExe = 'C:\Users\balaj\AppData\Local\OpenClaw\deps\portable-git\mingw64\bin\git.exe'

Set-Location "c:\Users\balaj\Downloads\files1\skinwatch-app"

Write-Host "--- Checking Remote URLs ---"
& $gitExe remote -v

Write-Host "--- Trying push to exact repo with dot if needed ---"
& $gitExe remote set-url origin "https://github.com/balajichanthiran98-ux/skinwatch-app."
& $gitExe push -u origin main --force

Write-Host "--- Result ---"
& $gitExe log -n 1
