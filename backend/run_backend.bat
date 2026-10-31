@echo off
title Vardayini Sweet Mart — FastAPI Backend
echo =====================================================================
echo  VARDAYINI SWEET MART — PYTHON FASTAPI BACKEND (PORT 8000)
echo =====================================================================
echo.
cd /d "%~dp0"

IF EXIST ".venv\Scripts\activate.bat" (
    echo Activating dedicated virtual environment (.venv)...
    call .venv\Scripts\activate.bat
) ELSE (
    echo Virtual environment not found, falling back to system python...
)

echo Starting Uvicorn server on http://localhost:8000...
echo Swagger UI documentation: http://localhost:8000/docs
echo ReDoc documentation:      http://localhost:8000/redoc
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
