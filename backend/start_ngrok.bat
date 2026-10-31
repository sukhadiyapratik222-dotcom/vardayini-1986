@echo off
title Vardayini Sweet Mart — ngrok Public Tunnel
echo =====================================================================
echo  VARDAYINI SWEET MART — NGROK SECURE PUBLIC TUNNEL
echo =====================================================================
echo.
echo Tunneling local port 8000 to public HTTPS...
echo Copy the Forwarding HTTPS URL (e.g. https://xxxx.ngrok-free.app)
echo and paste it as NEXT_PUBLIC_API_URL in your Vercel Project Settings!
echo.
ngrok http 8000

pause
