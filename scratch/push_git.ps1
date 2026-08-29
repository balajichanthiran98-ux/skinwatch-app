$gitExe = 'C:\Users\balaj\AppData\Local\OpenClaw\deps\portable-git\mingw64\bin\git.exe'

Set-Location "c:\Users\balaj\Downloads\files1\skinwatch-app"

Write-Host "--- Git Remotes ---"
& $gitExe remote -v

Write-Host "--- Staging Files ---"
& $gitExe add -A

Write-Host "--- Git Status ---"
& $gitExe status

Write-Host "--- Committing ---"
& $gitExe commit -m "feat: complete SkinWatch with 7D climate analytics and 10 Anime facial yoga exercises" 2>$null

Write-Host "--- Current Branch ---"
& $gitExe branch -M main

Write-Host "--- Push to Remote ---"
& $gitExe push -u origin main --force

Write-Host "--- Latest Commit Info ---"
& $gitExe log -n 3 --oneline
