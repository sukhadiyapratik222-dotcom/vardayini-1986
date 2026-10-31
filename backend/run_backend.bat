@echo off
title Vardayini Sweet Mart — FastAPI Backend
echo =====================================================================
echo  VARDAYINI SWEET MART — PYTHON FASTAPI BACKEND (PORT 8000)
echo =====================================================================
echo.
cd /d "%~dp0"

echo Starting Uvicorn server on http://localhost:8000...
echo Swagger UI documentation: http://localhost:8000/docs
echo ReDoc documentation:      http://localhost:8000/redoc
echo.

IF EXIST ".venv\Scripts\python.exe" (
    echo [OK] Using dedicated virtual environment (.venv)...
    ".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) ELSE (
    echo [NOTICE] Using system Python...
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)

pause

