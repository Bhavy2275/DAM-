
Param(
    [Parameter(Mandatory=$true)]
    [String]$Path
)

Process {
    if (-not (Test-Path -Path $Path)) {
        Write-Error "Error: File not found at $Path"
        return
    }

    try {
        # 1. Create a safe backup
        $backupPath = "$Path.bak"
        Copy-Item -Path $Path -Destination $backupPath -Force
        Write-Host "Backup created: $backupPath"

        # 2. Read file content manually
        $content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

        # 3. Apply text-level replacements
        $replacements = @{
            "â‚¹" = "₹"
            "Ã¢â€šÂ¹" = "₹"
            "Ã¢â‚¬â€" = "—"
            "Ã°Å¸â€œÂ " = "📍"
            "Ã°Å¸â€“Â¼" = "🖼️"
            "Ã°Å¸â€œâ€ž" = "📄"
            "Ã‚Â°" = "°"
            "Ã°Å¸Å’Â¡" = "🌡️"
            "Ã¢â‚¬Â¦" = "..."
        }

        foreach ($bad in $replacements.Keys) {
            if ($content.Contains($bad)) {
                $content = $content.Replace($bad, $replacements[$bad])
            }
        }

        # 4. Clean up comment banners
        $content = $content -replace "Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬", "───"
        $content = $content -replace "â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬", "───"
        $content = $content -replace "Ã¢â€â‚¬", "──"
        $content = $content -replace "â‚¬Ã¢â€â‚¬", "──"

        # 5. Atomic write with temporary file
        $tempPath = "$Path.tmp"
        [System.IO.File]::WriteAllText($tempPath, $content, [System.Text.Encoding]::UTF8)
        
        Move-Item -Path $tempPath -Destination $Path -Force
        Write-Host "Surgical cleanup and BOM removal complete for $Path"
    }
    catch {
        Write-Error "An unexpected error occurred: $_"
    }
}
