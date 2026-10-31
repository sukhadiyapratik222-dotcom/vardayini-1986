@echo off
setlocal
cd /d "%~dp0"

title Vardayini Sweet Mart - System Starter

echo ================================================================
echo        VARDAYINI SWEET MART - COMPLETE SYSTEM LAUNCHER
echo ================================================================
echo.
echo This script will start everything you need in 3 separate windows:
echo   1. Local MongoDB Database  (Port 27017)
echo   2. Python FastAPI Backend  (Port 8000)
echo   3. Secure Public Tunnel    (ngrok / localtunnel)
echo.
echo ================================================================
echo.

echo [1/3] Checking MongoDB Server (Port 27017)...
call backend\.venv\Scripts\python.exe backend\check_mongo.py 27017 >nul 2>nul
if %errorlevel% equ 0 (
    echo   -> [OK] MongoDB is already running!
) else (
    echo   -> [STARTING] Opening MongoDB in separate window...
    start "MongoDB Server (Port 27017)" cmd /k "%~dp0start-mongo.bat"
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/3] Checking FastAPI Backend (Port 8000)...
call backend\.venv\Scripts\python.exe backend\check_mongo.py 8000 >nul 2>nul
if %errorlevel% equ 0 (
    echo   -> [OK] Backend is already running!
) else (
    echo   -> [STARTING] Opening FastAPI Backend in separate window...
    start "Vardayini Backend (Port 8000)" cmd /k "%~dp0start-backend.bat"
    timeout /t 4 /nobreak >nul
)

echo.
echo [3/3] Starting Public Tunnel...
start "Public Tunnel (Port 8000)" cmd /k "%~dp0start-ngrok.bat"

echo.
echo ================================================================
echo ALL SERVICES ARE LAUNCHED!
echo.
echo - Health Check:    http://localhost:8000/api/health
echo - API Docs (Swagger): http://localhost:8000/docs
echo - Check the "Public Tunnel" window for your public HTTPS URL!
echo ================================================================
echo.
pause

