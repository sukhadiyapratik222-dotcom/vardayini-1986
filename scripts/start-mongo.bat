@echo off
title MongoDB Server 27017
echo ========================================================
echo   Starting Local MongoDB Server on localhost:27017
echo   Database Path: %USERPROFILE%\mongodb-data
echo ========================================================
if not exist "%USERPROFILE%\mongodb-data" mkdir "%USERPROFILE%\mongodb-data"
"%USERPROFILE%\Downloads\mongodb-windows-x86_64-9.0.2\mongodb-win32-x86_64-windows-9.0.2\bin\mongod.exe" --dbpath "%USERPROFILE%\mongodb-data" --bind_ip 127.0.0.1 --port 27017
pause
