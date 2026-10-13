param(
    [string]$FramesFolder = "..\frames",
    [string]$OutputPath = ".\animation.mp4",
    [int]$FrameRate = 30
)

$ErrorActionPreference = "Stop"

$frames = Get-ChildItem -LiteralPath $FramesFolder -Filter "Prototype frame*.png" -File |
    Sort-Object {
        if ($_.Name -match '(\d+)\.png$') { [int]$Matches[1] } else { 0 }
    }

if ($frames.Count -eq 0) {
    throw "No matching PNG frames found in: $FramesFolder"
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    throw "FFmpeg is not installed or isn't on PATH. Install FFmpeg, then reopen the terminal."
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputFolder = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputFolder | Out-Null

$tempFolder = Join-Path $env:TEMP ("video-frames-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempFolder | Out-Null

try {
    for ($i = 0; $i -lt $frames.Count; $i++) {
        $numberedName = "frame{0:D6}.png" -f $i
        Copy-Item -LiteralPath $frames[$i].FullName -Destination (Join-Path $tempFolder $numberedName)
    }

    $inputPattern = Join-Path $tempFolder "frame%06d.png"
    & $ffmpeg.Source -y -framerate $FrameRate -i $inputPattern -c:v libx264 -pix_fmt yuv420p -movflags +faststart $outputFullPath

    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed to create the video."
    }

    Write-Host "Video created: $outputFullPath"
}
finally {
    Remove-Item -LiteralPath $tempFolder -Recurse -Force -ErrorAction SilentlyContinue
}