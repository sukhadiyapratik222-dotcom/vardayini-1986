@echo off
setlocal
cd /d "%~dp0"

title Vardayini Sweet Mart Public Tunnel (Port 8000)

echo ===================================================
echo VARDAYINI SWEET MART - SECURE PUBLIC TUNNEL
echo ===================================================
echo.

set "PYTHON_CMD=python"
if exist ".venv\Scripts\python.exe" set "PYTHON_CMD=.venv\Scripts\python.exe"

REM Verify backend is running on port 8000
"%PYTHON_CMD%" check_mongo.py 8000 >nul 2>nul
if %errorlevel% equ 0 goto BACKEND_RUNNING

echo [NOTICE] Backend is not running on port 8000 yet.
echo [INFO] Starting Backend automatically in a new window...
start "Vardayini Backend (Port 8000)" cmd /c "%~dp0run_backend.bat"
echo [INFO] Waiting for Backend to initialize...
timeout /t 5 /nobreak >nul

:BACKEND_RUNNING
echo [OK] Backend is active on port 8000!
echo.

where ngrok >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Starting ngrok tunnel on port 8000...
    echo Copy the https://xxxx.ngrok-free.app URL generated below!
    echo.
    ngrok http 8000
) else (
    echo [NOTICE] ngrok CLI not found on your system.
    echo Starting instant free tunnel via localtunnel...
    echo.
    echo ================================================================
    echo 1. Copy the 'https://...loca.lt' URL shown below
    echo 2. Open it in Chrome to verify: https://...loca.lt/api/health
    echo 3. Paste it as NEXT_PUBLIC_API_URL in Vercel Environment Variables!
    echo ================================================================
    echo.
    npx --yes localtunnel --port 8000
)

echo.
echo [NOTICE] Tunnel stopped.
pause
