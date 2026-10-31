@echo off
title Vardayini Sweet Mart — Public Tunnel (Port 8000)
echo =====================================================================
echo  VARDAYINI SWEET MART — SECURE PUBLIC TUNNEL (PORT 8000)
echo =====================================================================
echo.

where ngrok >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Starting ngrok tunnel on port 8000...
    echo Copy the real HTTPS URL shown below (do NOT copy example URLs)
    echo and paste it as NEXT_PUBLIC_API_URL in Vercel!
    echo.
    ngrok http 8000
) else (
    echo [NOTICE] 'ngrok' CLI was not found on your system.
    echo Starting instant public tunnel via localtunnel (no sign-up needed)...
    echo.
    echo Copy the 'https://...loca.lt' URL shown below and test it in your browser!
    echo.
    npx --yes localtunnel --port 8000
)

pause

