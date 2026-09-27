Add-Type -AssemblyName System.Drawing
$src = (Resolve-Path 'slides\output\enhance-slide-05.png').Path
$dst = (Resolve-Path 'slides\output').Path + '\crop-pill.png'
$img = [System.Drawing.Image]::FromFile($src)
$crop = New-Object System.Drawing.Rectangle(0, 110, 700, 100)
$bmp = $img.Clone($crop, $img.PixelFormat)
$bmp.Save($dst)
$bmp.Dispose()
$img.Dispose()
Write-Host ('wrote: ' + $dst)
