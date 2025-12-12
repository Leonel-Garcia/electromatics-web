@echo off
echo ========================================
echo   ELECTROMATICS - Iniciando Aplicacion
echo ========================================
echo.
echo Este script iniciara:
echo   1. Backend (FastAPI) en puerto 8001
echo   2. Frontend (HTTP Server) en puerto 5500
echo.
echo Acceso a la aplicacion:
echo   Frontend: http://localhost:5500
echo   Backend API: http://localhost:8001
echo.
echo IMPORTANTE: No cierres esta ventana mientras uses la aplicacion
echo ========================================
echo.

REM Iniciar Backend en una nueva ventana
echo [1/2] Iniciando Backend...
start "Electromatics Backend" /D "%~dp0" cmd /k "call .venv\Scripts\activate && cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"

REM Esperar 3 segundos para que el backend inicie
timeout /t 3 /nobreak >nul

REM Iniciar Frontend en una nueva ventana
echo [2/2] Iniciando Frontend...
start "Electromatics Frontend" /D "%~dp0" cmd /k "python -m http.server 5500"

echo.
echo ========================================
echo   Aplicacion iniciada correctamente!
echo ========================================
echo.
echo Abre tu navegador en: http://localhost:5500
echo.
echo Para detener la aplicacion, cierra las ventanas del Backend y Frontend
echo.
pause
