@echo off
title Vardayini Sweet Mart — Cloudflare Tunnel (Port 8000)
echo =====================================================================
echo  VARDAYINI SWEET MART — CLOUDFLARE SECURE TUNNEL (PORT 8000)
echo =====================================================================
echo.
cd /d "%~dp0"

IF EXIST "backend\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("backend\.env") do (
        if "%%A"=="CLOUDFLARE_TUNNEL_TOKEN" set CLOUDFLARE_TUNNEL_TOKEN=%%B
    )
)

IF DEFINED CLOUDFLARE_TUNNEL_TOKEN (
    IF NOT "%CLOUDFLARE_TUNNEL_TOKEN%"=="" (
        echo [OK] Cloudflare Named Tunnel token detected in .env!
        echo Starting Cloudflare Named Tunnel for your permanent custom domain...
        echo.
        backend\cloudflared.exe tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN%
        goto end
    )
)

echo [NOTICE] No CLOUDFLARE_TUNNEL_TOKEN found in backend\.env.
echo Starting instant Cloudflare Quick Tunnel on http://localhost:8000...
echo.
echo Look for the 'https://...trycloudflare.com' link in the output below!
echo.
backend\cloudflared.exe tunnel --url http://localhost:8000

:end
pause
