"""
Script para aplicar diseño premium a todas las páginas HTML de Electromatics
Agrega los archivos CSS y JS premium a todas las páginas que aún no los tienen
"""

import os
import glob
from pathlib import Path

# Directorio del proyecto
PROJECT_DIR = Path(__file__).parent

# Archivos CSS y JS a agregar
PREMIUM_CSS = '<link rel="stylesheet" href="css/premium-enhancements.css?v=1.0" />'
PREMIUM_JS = '<script src="js/premium-interactions.js?v=1.0"></script>'

# Páginas a excluir (ya tienen el diseño premium)
EXCLUDE_FILES = {
    'index.html',
    'calculadora.html',
    'demo-premium.html',
    'joseph_swan_page.html', # Página especial del museo
}

def add_premium_to_html(file_path):
    """Agrega CSS y JS premium a un archivo HTML"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        modified = False
        
        # Verificar si ya tiene el CSS premium
        if 'premium-enhancements.css' not in content:
            # Buscar el primer link de stylesheet y agregar después
            if 'css/style.css' in content:
                content = content.replace(
                    'css/style.css?v=3.0" />',
                    'css/style.css?v=3.0" />\n    ' + PREMIUM_CSS
                )
                modified = True
                print(f"  [OK] CSS premium agregado")
        
        # Verificar si ya tiene el JS premium
        if 'premium-interactions.js' not in content:
            # Buscar el cierre de body y agregar antes
            if '</body>' in content:
                # Buscar la última línea de script antes de </body>
                lines = content.split('\n')
                body_index = -1
                for i in range(len(lines)-1, -1, -1):
                    if '</body>' in lines[i]:
                        body_index = i
                        break
                
                if body_index != -1:
                    # Buscar el último script antes de body
                    for i in range(body_index-1, -1, -1):
                        if '<script' in lines[i]:
                            # Insertar después de este script
                            lines.insert(i+1, f'    {PREMIUM_JS}')
                            content = '\n'.join(lines)
                            modified = True
                            print(f"  [OK] JS premium agregado")
                            break
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        else:
            print(f"  [INFO] Ya tiene diseno premium")
            return False
            
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    print("Aplicando diseno premium a todas las paginas HTML...\n")
    
    # Buscar todos los archivos HTML en el directorio raíz
    html_files = glob.glob(str(PROJECT_DIR / "*.html"))
    
    updated_count = 0
    skipped_count = 0
    
    for html_file in html_files:
        file_name = os.path.basename(html_file)
        
        # Saltar archivos excluidos
        if file_name in EXCLUDE_FILES:
            print(f"[X] {file_name} (excluido)")
            continue
        
        print(f"[+] Procesando: {file_name}")
        
        if add_premium_to_html(html_file):
            updated_count += 1
        else:
            skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"Proceso completado!")
    print(f"   Paginas actualizadas: {updated_count}")
    print(f"   Paginas omitidas: {skipped_count}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
