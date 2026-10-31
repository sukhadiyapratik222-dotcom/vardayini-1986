@echo off
setlocal
cd /d "%~dp0"

title Vardayini Sweet Mart Backend (Port 8000)

echo ===================================================
echo Starting Vardayini Sweet Mart Backend on Port 8000
echo ===================================================
echo.

REM Select Python executable
set "PYTHON_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=.venv\Scripts\python.exe"
    echo [OK] Using dedicated Python environment (.venv)
)

REM Check if MongoDB is running on port 27017
"%PYTHON_CMD%" check_mongo.py >nul 2>nul
if %errorlevel% equ 0 goto MONGO_READY

echo [NOTICE] MongoDB is not running on port 27017.
echo [INFO] Starting MongoDB Server automatically in a new window...
start "MongoDB Server (Port 27017)" cmd /c "%~dp0..\start-mongo.bat"
echo [INFO] Waiting for MongoDB to initialize...
timeout /t 4 /nobreak >nul

REM Check again after auto-start
"%PYTHON_CMD%" check_mongo.py >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is now active on port 27017!
    goto MONGO_READY
)

echo [WARNING] MongoDB is taking longer to start or using another path.
echo [WARNING] If errors occur, check the MongoDB window or open MongoDB Compass.
echo.

:MONGO_READY
echo [OK] MongoDB connection verified!
echo.
echo ===================================================
echo Backend API Docs: http://localhost:8000/docs
echo Health Check:     http://localhost:8000/api/health
echo Products API:     http://localhost:8000/api/products
echo ===================================================
echo.

"%PYTHON_CMD%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo [NOTICE] Backend server stopped.
pause
