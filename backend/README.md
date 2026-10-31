# Vardayini Sweet Mart — Python FastAPI Backend

Temporary, high-performance **Python FastAPI** backend connecting your local **MongoDB Compass** instance (`mongodb://127.0.0.1:27017/`) to the **Vardayini Sweet Mart** Next.js website (local and deployed on Vercel) through an encrypted **ngrok** tunnel.

---

## 🚀 Quick Start (Windows)

### Option A: 1-Click Launchers
1. Double-click `run_backend.bat` to launch the FastAPI server on `http://localhost:8000`.
2. Double-click `start_ngrok.bat` to open the public tunnel on port 8000.
3. Copy the generated `https://xxxx.ngrok-free.app` URL and set it as `NEXT_PUBLIC_API_URL` in your Vercel deployment.

---

### Option B: Manual Command Line Execution

#### 1. Setup Virtual Environment & Install Dependencies
Open PowerShell or Command Prompt in the `backend/` directory:
```powershell
cd c:\Users\SukhadiyaPratikPares\vrdayini-sweet\backend

# Activate the pre-configured virtual environment
.\.venv\Scripts\Activate.ps1

# (Optional) Re-install or update dependencies
pip install -r requirements.txt
```

#### 2. Start the FastAPI Server
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 3. Expose via ngrok
In a separate terminal window:
```powershell
ngrok http 8000
```
ngrok will print:
```text
Forwarding   https://xyz-your-tunnel.ngrok-free.app -> http://localhost:8000
```

---

## 🌐 Connecting Vercel Frontend to the Backend

### 1. In Vercel Project Settings
1. Go to your **Vercel Dashboard** -> select your `vardayini` project.
2. Navigate to **Settings** -> **Environment Variables**.
3. Add / Update the variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://xyz-your-tunnel.ngrok-free.app` (your ngrok HTTPS URL)
4. Redeploy your project (or trigger a new commit/build).

### 2. For Local Testing
In `ai-genrated/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://xyz-your-tunnel.ngrok-free.app
```
*(If left empty or commented out, the website automatically falls back to the internal database).*

---

## 🔄 How to Restart ngrok & Update the API URL

Free ngrok URLs change every time you restart the ngrok process. When your URL changes:

1. **Start ngrok**: Run `ngrok http 8000`.
2. **Copy new HTTPS URL**: e.g., `https://abc-123.ngrok-free.app`.
3. **Update Vercel**:
   - In Vercel -> Settings -> Environment Variables, update `NEXT_PUBLIC_API_URL` with the new URL.
   - Click **Redeploy** on your latest deployment.
4. **Update Local (if testing locally)**:
   - Paste the new URL into `ai-genrated/.env.local`.
   - Restart the Next.js dev server.

*(Tip: If you have a free ngrok account, you can claim a permanent static domain under `ngrok.com/dashboard/domains` and run `ngrok http --url=your-static-domain.ngrok-free.app 8000` so the URL never changes).*

---

## 📂 Backend Architecture

```text
backend/
├── main.py              # Application entrypoint, CORS & rate-limiting middleware
├── database.py          # Async Motor MongoDB connection pool & collection helpers
├── auth.py              # Native bcrypt hashing, JWT access token issue & admin guard
├── requirements.txt     # Python package dependencies
├── .env                 # Active local environment configuration (git-ignored)
├── .env.example         # Template configuration documentation
├── run_backend.bat      # Windows 1-click startup launcher
├── start_ngrok.bat      # Windows 1-click ngrok tunnel launcher
├── test_api.py          # Automated verification test suite (7 tests)
├── routers/
│   ├── products.py      # Products CRUD (GET, POST, PUT, DELETE)
│   ├── customers.py     # Customer Registration, Login & Profile (/customers, /auth)
│   └── orders.py        # Order Checkout, Listing & Status Tracking
└── schemas/
    ├── product.py       # Pydantic schemas for products and variants
    ├── customer.py      # Pydantic schemas for customers and auth
    └── order.py         # Pydantic schemas for orders, items and shipping addresses
```

---

## 🛡️ Security Implementation
- **Port Isolation**: MongoDB port `27017` is bound strictly to `127.0.0.1` and never exposed over ngrok or the internet.
- **CORS Protection**: Allows frontend domains (Vercel, localhost:3000, localhost:3001, ngrok) with full support for preflight `OPTIONS` requests.
- **Admin Endpoint Protection**: Protected by `x-admin-key` header or Admin Bearer JWT token.
- **Password Security**: Native bcrypt (`$2b$`) password hashing matching the existing Next.js database format.
- **Zero Credential Exposure**: Database credentials reside solely in `backend/.env` and are never sent to frontend JavaScript.
- **Rate Limiting**: Built-in in-memory rate limiting blocks spam and brute force attacks.
- **Interleaved Fallback**: If ngrok or the Python backend ever goes offline, the Next.js storefront gracefully falls back to internal routes without crashing.

---

## 📊 Summary of REST API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Backend and MongoDB live health status | None |
| `GET` | `/api/products` | List catalog products with search, category, and variants | None |
| `GET` | `/api/products/{id}` | Get single product by numeric ID or slug | None |
| `POST` | `/api/products` | Create new product and packaging variants | Admin (`x-admin-key`) |
| `PUT` | `/api/products/{id}` | Update product details or stock | Admin (`x-admin-key`) |
| `DELETE` | `/api/products/{id}` | Delete product and associated variants | Admin (`x-admin-key`) |
| `POST` | `/api/customers/register` | Register new customer account | None |
| `POST` | `/api/customers/login` | Authenticate customer and get JWT token | None |
| `GET` | `/api/customers/me` | Fetch authenticated customer profile | Bearer Token |
| `PUT` | `/api/customers/me` | Update customer profile | Bearer Token |
| `POST` | `/api/orders` | Place e-commerce order (delivery or store pickup) | None (Guest/User) |
| `GET` | `/api/orders` | List orders (Admin sees all, customer sees own) | User / Admin |
| `GET` | `/api/orders/{orderNumber}` | Retrieve order details by order tracking code | None |
| `PATCH` | `/api/orders/{orderNumber}/status` | Update status (pending -> confirmed -> delivered) | Admin (`x-admin-key`) |
