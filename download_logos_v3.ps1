$logos = @(
    @{Name = "MATLAB"; Url = "https://download.logo.wine/logo/MATLAB/MATLAB-Logo.wine.png"; File = "matlab_logo.png" },
    @{Name = "Simulink"; Url = "https://download.logo.wine/logo/Simulink/Simulink-Logo.wine.png"; File = "simulink_logo.png" },
    @{Name = "AutoCAD Electrical"; Url = "https://download.logo.wine/logo/AutoCAD/AutoCAD-Logo.wine.png"; File = "autocad_logo.png" },
    @{Name = "LabVIEW"; Url = "https://download.logo.wine/logo/LabVIEW/LabVIEW-Logo.wine.png"; File = "labview_logo.png" },
    @{Name = "SolidWorks Electrical"; Url = "https://download.logo.wine/logo/SolidWorks/SolidWorks-Logo.wine.png"; File = "solidworks_logo.png" },
    @{Name = "OrCAD"; Url = "https://seeklogo.com/images/O/orcad-logo-1906927950-seeklogo.com.png"; File = "orcad_logo.png" }, 
    @{Name = "PSpice"; Url = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Cadence_Design_Systems_logo.svg/1200px-Cadence_Design_Systems_logo.svg.png"; File = "pspice_logo.png" },
    @{Name = "DIgSILENT"; Url = "https://www.digsilent.de/assets/images/layout/logo_digsilent.png"; File = "digsilent_logo.png" },
    @{Name = "EPLAN"; Url = "https://www.eplan-software.com/fileadmin/templates/images/logo_eplan.png"; File = "eplan_logo.png" }
)

$destDir = "c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\images\software"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

foreach ($logo in $logos) {
    $output = Join-Path $destDir $logo.File
    # Skip if exists and > 1KB
    if (Test-Path $output) {
        $item = Get-Item $output
        if ($item.Length -gt 1000) {
            Write-Host "Skipping $($logo.Name) - valid file exists."
            continue
        }
    }

    Write-Host "Downloading $($logo.Name)..."
    try {
        $request = [System.Net.WebRequest]::Create($logo.Url)
        $request.Timeout = 15000
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
