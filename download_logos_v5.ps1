$logos = @(
    @{Name = "EPLAN"; Url = "https://raw.githubusercontent.com/eplan/eplan-developer-basics/main/assets/eplan_logo.svg"; File = "eplan_logo.svg" },
    @{Name = "SolidWorks"; Url = "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/solidworks.svg"; File = "solidworks_logo.svg" },
    @{Name = "AutoCAD"; Url = "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/autocad.svg"; File = "autocad_logo.svg" },
    @{Name = "DIgSILENT"; Url = "https://www.digsilent.de/fileadmin/templates/images/DIGSILENT_Logo_header.svg"; File = "digsilent_logo.svg" },
    @{Name = "Simulink"; Url = "https://upload.wikimedia.org/wikipedia/commons/8/87/Simulink_logo.png"; File = "simulink_logo.png" },
    @{Name = "OrCAD"; Url = "https://upload.wikimedia.org/wikipedia/commons/f/f6/OrCAD_logo.svg"; File = "orcad_logo.svg" }
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
        $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
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
