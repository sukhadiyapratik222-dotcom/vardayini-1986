@echo off
setlocal
title MongoDB Server (Port 27017) - Vardayini Sweet Mart

echo ===================================================
echo   VARDAYINI SWEET MART - LOCAL MONGODB SERVER
echo ===================================================
echo.

REM 1. Check if MongoDB is already running on port 27017
call "%~dp0backend\.venv\Scripts\python.exe" "%~dp0backend\check_mongo.py" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is ALREADY RUNNING and listening on port 27017!
    echo [OK] Ready for FastAPI Backend and MongoDB Compass.
    echo.
    echo (You can safely close this window)
    pause
    exit /b 0
)

REM 2. Resolve mongod.exe location
set "MONGO_EXE=C:\Users\SukhadiyaPratikPares\Downloads\mongodb-windows-x86_64-9.0.2\mongodb-win32-x86_64-windows-9.0.2\bin\mongod.exe"
set "DATA_DIR=C:\Users\SukhadiyaPratikPares\mongodb-data"

if not exist "%MONGO_EXE%" (
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set "MONGO_EXE=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set "MONGO_EXE=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
)

if not exist "%MONGO_EXE%" (
    echo [ERROR] mongod.exe was not found at:
    echo   %MONGO_EXE%
    echo.
    echo Please start MongoDB using MongoDB Compass or Windows Services.
    pause
    exit /b 1
)

if not exist "%DATA_DIR%" (
    echo [INFO] Creating MongoDB data directory: %DATA_DIR%
    mkdir "%DATA_DIR%"
)

echo [INFO] Starting MongoDB Server on port 27017...
echo [INFO] Database storage: %DATA_DIR%
echo [INFO] KEEP THIS WINDOW OPEN while using the website!
echo ===================================================
echo.

"%MONGO_EXE%" --dbpath "%DATA_DIR%" --bind_ip 127.0.0.1 --port 27017

echo.
echo [NOTICE] MongoDB has stopped.
pause
