@echo off
echo ========================================
echo   CONFIGURANDO GIT AUTOMATICAMENTE
echo ========================================
echo.

REM Forzar uso del Git completo
set GIT_PATH="C:\Program Files\Git\cmd\git.exe"

echo 1. Inicializando repositorio...
%GIT_PATH% init

echo 2. Agregando archivos...
%GIT_PATH% add .

echo 3. Guardando cambios...
%GIT_PATH% commit -m "Preparado para despliegue en Render"

echo 4. Configurando rama principal...
%GIT_PATH% branch -M main

echo 5. Conectando con GitHub...
%GIT_PATH% remote remove origin
%GIT_PATH% remote add origin https://github.com/Leonel-Garcia/electromatics-web.git

echo.
echo ========================================
echo   LISTO! AHORA INTENTA SUBIRLO
echo ========================================
echo.
echo Ejecutando comando de subida (TE PEDIRA INICIAR SESION)...
echo.
%GIT_PATH% push -u origin main

pause
