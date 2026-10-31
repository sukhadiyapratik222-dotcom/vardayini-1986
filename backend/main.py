import os
import time
import datetime
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vardayini.main")

from database import (
    resolve_active_database,
    ping_database,
    init_db_indexes,
    close_db_connection,
    get_active_db_name,
)
from routers import products, customers, orders

# Read settings from environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS_RAW = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://*.vercel.app,https://*.ngrok-free.app,https://*.ngrok.io,*",
)

allowed_origins: List[str] = [orig.strip() for orig in ALLOWED_ORIGINS_RAW.split(",") if orig.strip()]
if "*" in allowed_origins:
    allow_all_origins = True
    origins_list = ["*"]
else:
    allow_all_origins = False
    origins_list = allowed_origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event manager for FastAPI startup and shutdown."""
    logger.info("Starting Vardayini Sweet Mart FastAPI backend...")
    try:
        db = await resolve_active_database()
        active_db = get_active_db_name()
        logger.info(f"Connected to local MongoDB database: '{active_db}'")
        await init_db_indexes()
        health = await ping_database()
        logger.info(f"Database verification passed: {health.get('stats')}")
    except Exception as e:
        logger.error(f"Error during MongoDB initialization: {e}")

    yield

    logger.info("Shutting down FastAPI backend...")
    await close_db_connection()


app = FastAPI(
    title="Vardayini Sweet Mart API",
    version="1.0.0",
    description="Python FastAPI backend connected to local MongoDB Compass and exposed via ngrok for Vercel e-commerce storefront.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ------------------------------------------------------------------------------
# CORS CONFIGURATION
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else origins_list,
    allow_credentials=True if not allow_all_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ------------------------------------------------------------------------------
# SIMPLE IN-MEMORY RATE LIMITER & REQUEST LOGGER MIDDLEWARE
# ------------------------------------------------------------------------------
REQUEST_HISTORY: Dict[str, List[float]] = {}
MAX_REQUESTS_PER_MINUTE = 180


@app.middleware("http")
async def rate_limiting_and_security_middleware(request: Request, call_next):
    # Allow preflight OPTIONS requests without rate limits
    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old requests older than 60 seconds
    timestamps = REQUEST_HISTORY.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < 60]

    # Enforce rate limit (skip for local health checks)
    if len(timestamps) >= MAX_REQUESTS_PER_MINUTE and not request.url.path.endswith("/health"):
        logger.warning(f"Rate limit exceeded for client: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": "Rate limit exceeded. Please wait a moment before sending more requests.",
                "retry_after_seconds": 30,
            },
        )

    timestamps.append(now)
    REQUEST_HISTORY[client_ip] = timestamps

    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        return response
    except Exception as exc:
        logger.error(f"Unhandled exception processing {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error occurred. Our team has been notified.",
                "status_code": 500,
            },
        )


# ------------------------------------------------------------------------------
# HEALTH CHECK ENDPOINTS
# ------------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """
    Validates backend connectivity to MongoDB and reports live collection metrics.
    """
    try:
        db_health = await ping_database()
        return {
            "status": "healthy" if db_health.get("ok") else "degraded",
            "backend": "Python FastAPI",
            "version": "1.0.0",
            "database": {
                "connected": db_health.get("ok", False),
                "name": db_health.get("database"),
                "collections_count": db_health.get("collections_count", 0),
                "collections": db_health.get("collections", []),
                "stats": db_health.get("stats", {}),
            },
            "environment": ENVIRONMENT,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "backend": "Python FastAPI",
            "database": {
                "connected": False,
                "error": str(e),
            },
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }


# ------------------------------------------------------------------------------
# ROOT LANDING ENDPOINT (HTML for browser, JSON for API clients)
# ------------------------------------------------------------------------------
@app.get("/", tags=["Root"])
async def root_index(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        db_name = get_active_db_name()
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vardayini Sweet Mart — FastAPI Backend</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
        }}
        .card {{
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            max-width: 620px;
            width: 100%;
            padding: 36px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
        }}
        .badge-dot {{
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 10px #10b981;
        }}
        h1 {{
            font-size: 24px;
            margin: 0 0 6px 0;
            color: #f59e0b;
        }}
        p.subtitle {{
            color: #94a3b8;
            font-size: 14px;
            margin: 0 0 20px 0;
        }}
        .info-box {{
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 14px;
            line-height: 1.7;
        }}
        .info-box strong {{
            color: #38bdf8;
        }}
        .links {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }}
        .btn {{
            display: block;
            text-align: center;
            padding: 12px 14px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
        }}
        .btn-primary {{
            background: #f59e0b;
            color: #0f172a;
        }}
        .btn-primary:hover {{
            background: #d97706;
        }}
        .btn-secondary {{
            background: #334155;
            color: #f8fafc;
        }}
        .btn-secondary:hover {{
            background: #475569;
        }}
        .tip {{
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #334155;
            padding-top: 16px;
            line-height: 1.5;
        }}
        code {{
            background: #020617;
            padding: 2px 6px;
            border-radius: 4px;
            color: #fcd34d;
            font-family: monospace;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">
            <span class="badge-dot"></span>
            FastAPI Backend is Online
        </div>
        <h1>Vardayini Sweet Mart — Backend API</h1>
        <p class="subtitle">Pure Ghee Gujarati Mithai & Live Morning Farsan REST API</p>

        <div class="info-box">
            <div><strong>Database:</strong> Connected to local MongoDB (<code>{db_name}</code>)</div>
            <div><strong>Port:</strong> 8000 &bull; <strong>Environment:</strong> <code>{ENVIRONMENT}</code></div>
            <div><strong>Note:</strong> This tunnel URL is your <em>Backend API</em>. Your store website is hosted on <strong>Vercel</strong>.</div>
        </div>

        <div class="links">
            <a href="/docs" class="btn btn-primary" target="_blank">📖 Open Swagger API Docs</a>
            <a href="/api/health" class="btn btn-secondary" target="_blank">🩺 Health Check</a>
            <a href="/api/products" class="btn btn-secondary" target="_blank">🍬 Products Catalog</a>
            <a href="/api/orders" class="btn btn-secondary" target="_blank">📦 Orders API</a>
        </div>

        <div class="tip">
            💡 <strong>Next Step:</strong> Paste this URL as <code>NEXT_PUBLIC_API_URL</code> in your Vercel Project Settings to link your website to this backend!
        </div>
    </div>
</body>
</html>"""
        return HTMLResponse(content=html)

    return {
        "title": "Vardayini Sweet Mart — Python FastAPI Backend",
        "description": "Pure Ghee Gujarati Mithai & Live Morning Farsan API",
        "version": "1.0.0",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
        },
        "endpoints": {
            "health": "/api/health",
            "products": "/api/products",
            "customers_register": "/api/customers/register",
            "customers_login": "/api/customers/login",
            "orders": "/api/orders",
        },
        "status": "active",
    }


# ------------------------------------------------------------------------------
# MOUNT APPLICATION ROUTERS
# ------------------------------------------------------------------------------
# Mounted under /api prefix for Next.js frontend parity
app.include_router(products.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

# Also mount without /api prefix for convenience
app.include_router(products.router, prefix="")
app.include_router(customers.router, prefix="")
app.include_router(orders.router, prefix="")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
