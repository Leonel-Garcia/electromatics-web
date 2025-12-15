$books = @(
    @{Title="Circuitos Eléctricos"; ISBN="978-607-622-362-8"; File="circuitos_dorf.jpg"},
    @{Title="Análisis de Circuitos en Ingeniería"; ISBN="978-607-15-0802-7"; File="circuitos_hayt.jpg"},
    @{Title="Máquinas Eléctricas"; ISBN="978-6071507242"; File="maquinas_chapman.jpg"},
    @{Title="Sistemas de Control Automático"; ISBN="9781259643835"; File="control_kuo.jpg"},
    @{Title="Electromagnetismo"; ISBN="9786071507839"; File="electromagnetismo_hayt.jpg"},
    @{Title="Instalaciones Eléctricas Interiores"; ISBN="9789681839581"; File="instalaciones_becerril.jpg"},
    @{Title="Teoría Electromagnética"; ISBN="978-0321581747"; File="teoria_electromagnetica_reitz.jpg"},
    @{Title="Análisis de Sistemas Eléctricos de Potencia"; ISBN="9789701009086"; File="potencia_grainger.jpg"},
    @{Title="Electrónica de Potencia"; ISBN="978-6073233255"; File="electronica_potencia_rashid.jpg"},
    @{Title="Principios de Electrónica"; ISBN="978-84-481-5619-0"; File="principios_malvino.jpg"},
    @{Title="Diseño de Circuitos Electrónicos"; ISBN="978-0-19-933913-6"; File="microelectronica_sedra.jpg"},
    @{Title="Ingeniería de Control Moderna"; ISBN="9788483226605"; File="control_ogata.jpg"},
    @{Title="Máquinas Eléctricas y Transformadores"; ISBN="9789706136732"; File="maquinas_guru.jpg"},
    @{Title="Sistemas de Distribución"; ISBN="978-968-18-6715-7"; File="distribucion_enriquez.jpg"},
    @{Title="Instalaciones Eléctricas"; ISBN="9789681851958"; File="instalaciones_guerrero.jpg"}
)

$destDir = "c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\images\books"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

foreach ($book in $books) {
    # Try ISBN-13 first, then try simple search if needed but we have ISBNs
    $isbn = $book.ISBN -replace "-", ""
    $url = "https://covers.openlibrary.org/b/isbn/$isbn-L.jpg?default=false"
    $output = Join-Path $destDir $book.File
    
    Write-Host "Downloading $($book.Title)..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
        # Check if file is tiny (1x1 pixel means not found)
        $fileItem = Get-Item $output
        if ($fileItem.Length -lt 1000) {
            Write-Warning "Cover not found for $($book.Title) (File too small)"
            Remove-Item $output
        } else {
            Write-Host "Saved to $output"
        }
    } catch {
        Write-Warning "Failed to download $($book.Title): $_"
    }
}
