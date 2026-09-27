# Render a single PPTX slide to PNG via PowerPoint COM automation.
# Usage: powershell -ExecutionPolicy Bypass -File render-slide.ps1 <pptx> <slide-index-1-based> <png-out>
param(
    [Parameter(Mandatory=$true)][string]$PptxPath,
    [Parameter(Mandatory=$true)][int]$SlideIndex,
    [Parameter(Mandatory=$true)][string]$OutPng
)

$ErrorActionPreference = 'Stop'

# Resolve to absolute path
$PptxPath = (Resolve-Path $PptxPath).Path
$OutPng   = (Resolve-Path (Split-Path $OutPng -Parent)).Path + "\" + (Split-Path $OutPng -Leaf)

# Start PowerPoint (hidden)
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = 1   # 1 = visible so renders reliably; 0 = hidden sometimes fails silently
$ppt.WindowState = 2  # minimized

$pres = $ppt.Presentations.Open($PptxPath, $true, $true, $false) # ReadOnly=true, Untitled=true, WithWindow=false
$slide = $pres.Slides.Item($SlideIndex)
$slide.Export($OutPng, "PNG")

# Cleanup
$pres.Close()
$ppt.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($slide) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
[GC]::Collect()

Write-Host "Wrote: $OutPng"
