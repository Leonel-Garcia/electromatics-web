@echo off
echo ========================================
echo   ACTUALIZANDO GITHUB
echo ========================================

set GIT_PATH="C:\Program Files\Git\cmd\git.exe"

echo 1. Agregando cambios...
%GIT_PATH% add .

echo 2. Guardando...
%GIT_PATH% commit -m "Correccion configuracion Render"

echo 3. Subiendo...
%GIT_PATH% push origin main

echo.
echo LISTO! Ve a Render e intenta de nuevo.
pause
