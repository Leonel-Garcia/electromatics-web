$logos = @(
    @{Name = "MATLAB"; Url = "https://upload.wikimedia.org/wikipedia/commons/2/21/Matlab_Logo.png"; File = "matlab_logo.png" },
    @{Name = "Simulink"; Url = "https://upload.wikimedia.org/wikipedia/commons/8/87/Simulink_logo.png"; File = "simulink_logo.png" },
    @{Name = "AutoCAD Electrical"; Url = "https://i.pinimg.com/originals/13/2e/0f/132e0f2154674759d57a41ec456223d6.png"; File = "autocad_electrical_logo.png" },
    @{Name = "ETAP"; Url = "https://vectorseek.com/wp-content/uploads/2023/09/Etap-Logo-Vector.svg-.png"; File = "etap_logo.png" },
    @{Name = "DIgSILENT"; Url = "https://www.digsilent.de/assets/images/layout/logo_digsilent.png"; File = "digsilent_logo.png" },
    @{Name = "EPLAN"; Url = "https://seeklogo.com/images/E/eplan-software-service-gmbh-and-co-kg-logo-26914582E5-seeklogo.com.png"; File = "eplan_logo.png" },
    @{Name = "LabVIEW"; Url = "https://upload.wikimedia.org/wikipedia/commons/a/ad/LabVIEW_Logo.png"; File = "labview_logo.png" },
    @{Name = "PSpice"; Url = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Cadence_Design_Systems_logo.svg"; File = "pspice_logo.svg" }, 
    @{Name = "OrCAD"; Url = "https://seeklogo.com/images/O/orcad-logo-1906927950-seeklogo.com.png"; File = "orcad_logo.png" },
    @{Name = "SolidWorks Electrical"; Url = "https://upload.wikimedia.org/wikipedia/commons/0/0e/SolidWorks_Logo.png"; File = "solidworks_logo.png" }
)

$destDir = "c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\images\software"
# Ensure directory exists
if (!(Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

foreach ($logo in $logos) {
    $output = Join-Path $destDir $logo.File
    Write-Host "Downloading $($logo.Name)..."
    try {
        # Use a user agent to avoid basic blocks
        Invoke-WebRequest -Uri $logo.Url -OutFile $output -UserAgent "Mozilla/5.0" -ErrorAction Stop
        Write-Host "Saved to $output"
    }
    catch {
        Write-Warning "Failed to download $($logo.Name): $_"
    }
}
