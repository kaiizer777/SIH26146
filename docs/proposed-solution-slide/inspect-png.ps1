Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path 'slides\output\enhance-slide-05.png').Path)
Write-Host ('dims: ' + $img.Width + ' x ' + $img.Height)
$img.Dispose()
