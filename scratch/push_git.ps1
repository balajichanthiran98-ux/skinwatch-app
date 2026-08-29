$gitExe = 'C:\Users\balaj\AppData\Local\OpenClaw\deps\portable-git\mingw64\bin\git.exe'

Write-Host "Configuring Git..."
& $gitExe config --global user.name "balajichanthiran98-ux"
& $gitExe config --global user.email "balajichanthiran98@gmail.com"

Write-Host "Initializing repository..."
& $gitExe init

Write-Host "Staging files..."
& $gitExe add .

Write-Host "Creating commit..."
& $gitExe commit -m "feat: SkinWatch with Google Weather, 7D UV analytics & Anime Facial Exercises"

Write-Host "Setting main branch..."
& $gitExe branch -M main

Write-Host "Adding remote origin..."
& $gitExe remote remove origin 2>$null
& $gitExe remote add origin "https://github.com/balajichanthiran98-ux/skinwatch-app.git"

Write-Host "Git Status:"
& $gitExe status

Write-Host "Attempting push..."
& $gitExe push -u origin main
