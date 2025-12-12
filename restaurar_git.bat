@echo off
echo ========================================
echo   RESTAURACION COMPLETA DE GIT
echo ========================================

set GIT_PATH="C:\Program Files\Git\cmd\git.exe"

echo 1. Eliminando configuracion anterior corrupta...
rmdir /s /q .git

echo 2. Inicializando desde cero...
%GIT_PATH% init

echo 3. Configurando tu identidad (IMPORTANTE)...
%GIT_PATH% config user.email "lhomir14@gmail.com"
%GIT_PATH% config user.name "Leonel-Garcia"

echo 4. Agregando archivos...
%GIT_PATH% add .

echo 5. Guardando (Commit)...
%GIT_PATH% commit -m "Commit inicial restaurado"

echo 6. Configurando rama Main...
%GIT_PATH% branch -M main

echo 7. Conectando con GitHub...
%GIT_PATH% remote add origin https://github.com/Leonel-Garcia/electromatics-web.git

echo.
echo ========================================
echo   TODO LISTO PARA SUBIR
echo ========================================
echo.
echo Se abrira una ventana para que autorices.
echo.
%GIT_PATH% push -u origin main
echo.
pause
