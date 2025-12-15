$logos = @(
    @{Name = "SolidWorks"; Url = "https://cdn.simpleicons.org/solidworks/red"; File = "solidworks_logo.svg" },
    @{Name = "OrCAD"; Url = "https://cdn.simpleicons.org/orcad"; File = "orcad_logo.svg" },
    @{Name = "PSpice"; Url = "https://cdn.simpleicons.org/pspice"; File = "pspice_logo.svg" },
    @{Name = "EPLAN"; Url = "https://cdn.simpleicons.org/eplan"; File = "eplan_logo.svg" },
    @{Name = "AutoCAD"; Url = "https://cdn.simpleicons.org/autocad"; File = "autocad_logo.svg" }
)

$destDir = "c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\images\software"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

foreach ($logo in $logos) {
    $output = Join-Path $destDir $logo.File
    # Skip if exists and valid size
    if (Test-Path $output) {
        $item = Get-Item $output
        if ($item.Length -gt 500) { 
            Write-Host "Skipping $($logo.Name) - valid file exists."
            continue
        }
    }

    Write-Host "Downloading $($logo.Name)..."
    try {
        $request = [System.Net.WebRequest]::Create($logo.Url)
        $request.Timeout = 15000
        $request.UserAgent = "Mozilla/5.0"
        $response = $request.GetResponse()
        
        $stream = $response.GetResponseStream()
        $fileStream = [System.IO.File]::Create($output)
        $stream.CopyTo($fileStream)
        
        $fileStream.Close()
        $stream.Close()
        $response.Close()
        
        Write-Host "Saved to $output"
    }
    catch {
        Write-Warning "Failed to download $($logo.Name): $_"
    }
}
