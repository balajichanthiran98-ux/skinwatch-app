Add-Type -AssemblyName System.Drawing

function Generate-SkinWatchIcon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(250, 247, 242))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    $goldPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(212, 175, 55)), ($size * 0.05)
    $margin = $size * 0.12
    $rect = New-Object System.Drawing.RectangleF $margin, $margin, ($size - 2 * $margin), ($size - 2 * $margin)
    $g.DrawEllipse($goldPen, $rect)

    $dropBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(2, 132, 199))
    $dropMargin = $size * 0.28
    $dropRect = New-Object System.Drawing.RectangleF $dropMargin, ($size * 0.30), ($size - 2 * $dropMargin), ($size * 0.45)
    $g.FillEllipse($dropBrush, $dropRect)

    $sparkleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 158, 11))
    $g.FillEllipse($sparkleBrush, ($size * 0.65), ($size * 0.22), ($size * 0.08), ($size * 0.08))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created $outputPath"
}

$frontendDir = "c:\Users\balaj\Downloads\files1\skinwatch-app\frontend"
Generate-SkinWatchIcon 192 "$frontendDir\icon-192.png"
Generate-SkinWatchIcon 512 "$frontendDir\icon-512.png"
Generate-SkinWatchIcon 180 "$frontendDir\apple-touch-icon.png"
