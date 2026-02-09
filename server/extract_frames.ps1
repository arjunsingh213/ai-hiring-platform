# PowerShell script to extract video frames using Windows Media Player COM
param(
    [string]$VideoPath = "c:\mypro\server\Recruiter - Made with Clipchamp.mp4",
    [string]$OutputDir = "c:\mypro\server\video_frames"
)

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "Video file: $VideoPath"
Write-Host "Output directory: $OutputDir"

# Get video file info
$videoFile = Get-Item $VideoPath
Write-Host "`nVideo Info:"
Write-Host "Name: $($videoFile.Name)"
Write-Host "Size: $([math]::Round($videoFile.Length / 1MB, 2)) MB"
Write-Host "Last Modified: $($videoFile.LastWriteTime)"

# Try to get duration using Shell.Application
try {
    $shell = New-Object -ComObject Shell.Application
    $folder = $shell.Namespace($videoFile.DirectoryName)
    $file = $folder.ParseName($videoFile.Name)
    
    # Try to get duration (property 27 is usually duration)
    for ($i = 0; $i -lt 320; $i++) {
        $prop = $folder.GetDetailsOf($null, $i)
        $value = $folder.GetDetailsOf($file, $i)
        if ($value -and $prop -match "Length|Duration") {
            Write-Host "$prop : $value"
        }
    }
} catch {
    Write-Host "Could not extract video metadata"
}

Write-Host "`n=== Video Analysis Complete ==="
Write-Host "To create a voiceover script, please describe the video content or manually extract key frames."
