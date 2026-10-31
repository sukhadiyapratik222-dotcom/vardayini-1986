@echo off
setlocal
cd /d "%~dp0"

title Vardayini Sweet Mart Public Tunnel

echo ===================================================
echo VARDAYINI SWEET MART - SECURE PUBLIC TUNNEL
echo ===================================================
echo.

where ngrok >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Starting ngrok tunnel on port 8000...
    echo.
    ngrok http 8000
) else (
    echo [NOTICE] ngrok CLI not found on your system.
    echo Starting instant free tunnel via localtunnel...
    echo.
    echo Note: Keep start-backend.bat running in another window!
    echo.
    npx --yes localtunnel --port 8000
)

pause
