@echo off
echo ========================================
echo   ELECTROMATICS - Frontend Server
echo ========================================
echo.
echo Iniciando servidor web en puerto 5500...
echo.
echo IMPORTANTE:
echo   - Asegurate de que el Backend este corriendo (start_server.bat)
echo   - Accede a: http://localhost:5500
echo   - No cierres esta ventana mientras uses la aplicacion
echo.
echo ========================================
echo.
cd /d "%~dp0"
python -m http.server 5500
echo.
echo Servidor detenido.
pause
