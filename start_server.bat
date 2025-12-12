@echo off
echo Iniciando Servidor Electromatics...
echo.
echo Por favor, no cierres esta ventana mientras uses la aplicacion.
echo.
call .venv\Scripts\activate
cd backend
python -m uvicorn main:app --reload --port 8001
pause
