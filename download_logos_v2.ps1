$logos = @(
    @{Name = "Simulink"; Url = "https://upload.wikimedia.org/wikipedia/commons/8/87/Simulink_logo.png"; File = "simulink_logo.png" },
    @{Name = "AutoCAD Electrical"; Url = "https://upload.wikimedia.org/wikipedia/commons/d/d2/Autocad_logo.png"; File = "autocad_logo.png" },
    @{Name = "ETAP"; Url = "https://www.etap.com/images/default-source/logos/etap-logo.png"; File = "etap_logo.png" },
    @{Name = "DIgSILENT"; Url = "https://www.digsilent.de/assets/images/layout/logo_digsilent.png"; File = "digsilent_logo.png" },
    @{Name = "EPLAN"; Url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/EPLAN_Logo.svg/1200px-EPLAN_Logo.svg.png"; File = "eplan_logo.png" },
    @{Name = "LabVIEW"; Url = "https://upload.wikimedia.org/wikipedia/commons/a/ad/LabVIEW_Logo.png"; File = "labview_logo.png" },
    @{Name = "PSpice"; Url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cadence_Design_Systems_logo.svg/1200px-Cadence_Design_Systems_logo.svg.png"; File = "pspice_logo.png" }, 
    @{Name = "OrCAD"; Url = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/OrCAD_logo.svg/1200px-OrCAD_logo.svg.png"; File = "orcad_logo.png" },
    @{Name = "SolidWorks Electrical"; Url = "https://upload.wikimedia.org/wikipedia/commons/0/0e/SolidWorks_Logo.png"; File = "solidworks_logo.png" }
)

$destDir = "c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\images\software"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

foreach ($logo in $logos) {
    $output = Join-Path $destDir $logo.File
    if (Test-Path $output) {
        Write-Host "Skipping $($logo.Name) - already exists."
        continue
    }

    Write-Host "Downloading $($logo.Name)..."
    try {
        # Timeout after 10 seconds
        $request = [System.Net.WebRequest]::Create($logo.Url)
        $request.Timeout = 10000 
        $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
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
