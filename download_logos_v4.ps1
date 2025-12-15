$logos = @(
    @{Name = "LabVIEW"; Url = "https://raw.githubusercontent.com/devicons/devicon/master/icons/labview/labview-original.svg"; File = "labview_logo.svg" },
    @{Name = "Simulink"; Url = "https://upload.wikimedia.org/wikipedia/commons/8/87/Simulink_logo.png"; File = "simulink_logo.png" },
    @{Name = "DIgSILENT"; Url = "https://www.digsilent.de/fileadmin/templates/images/DIGSILENT_Logo_header.svg"; File = "digsilent_logo.svg" },
    @{Name = "AutoCAD"; Url = "https://upload.wikimedia.org/wikipedia/commons/d/d2/Autocad_logo.png"; File = "autocad_logo.png" },
    @{Name = "PSpice"; Url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cadence_Design_Systems_logo.svg/1200px-Cadence_Design_Systems_logo.svg.png"; File = "pspice_logo.png" },
    @{Name = "OrCAD"; Url = "https://upload.wikimedia.org/wikipedia/commons/f/f6/OrCAD_logo.svg"; File = "orcad_logo.svg" },
    @{Name = "SolidWorks"; Url = "https://upload.wikimedia.org/wikipedia/commons/0/0e/SolidWorks_Logo.png"; File = "solidworks_logo.png" },
    @{Name = "EPLAN"; Url = "https://upload.wikimedia.org/wikipedia/commons/c/c4/EPLAN_Logo.svg"; File = "eplan_logo.svg" }
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
        $request.Timeout = 20000
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
