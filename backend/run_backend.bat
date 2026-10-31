@echo off
setlocal
cd /d "%~dp0"

title Vardayini Sweet Mart Backend

echo ===================================================
echo Starting Vardayini Sweet Mart Backend on Port 8000
echo ===================================================

if exist ".venv\Scripts\python.exe" goto USE_VENV
goto USE_SYSTEM

:USE_VENV
echo [OK] Using dedicated Python environment (.venv)
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
goto END

:USE_SYSTEM
echo [OK] Using system Python
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
goto END

:END
pause
