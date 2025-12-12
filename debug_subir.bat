@echo on
REM === MODO DEPPURACION ===

set GIT_PATH="C:\Program Files\Git\cmd\git.exe"

REM Probando si git existe...
%GIT_PATH% --version

REM 1. Inicializando...
%GIT_PATH% init

REM 2. Agregando...
%GIT_PATH% add .

REM 3. Guardando...
%GIT_PATH% commit -m "Intento de despliegue debug"

REM 4. Rama...
%GIT_PATH% branch -M main

REM 5. Remoto...
%GIT_PATH% remote remove origin
%GIT_PATH% remote add origin https://github.com/Leonel-Garcia/electromatics-web.git

REM 6. SUBIENDO...
echo "INTENTANDO SUBIR - MIRA SI SALE ALGUNA VENTANA"
%GIT_PATH% push -u origin main

pause
