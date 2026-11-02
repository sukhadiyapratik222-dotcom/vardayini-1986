# Vercel deployment: storefront + admin dashboard

This repository contains **two separate Next.js applications**:

| App | Folder | Purpose |
| --- | --- | --- |
| Storefront + backend API | `ai-genrated` | Public shop, auth, and every `/api/*` route |
| Admin dashboard | `admin-dashboard` | Admin UI that calls the storefront through `/api/store/*` |

They must be deployed as **two Vercel projects**, each with its own Root
Directory. The dashboard is a client of the storefront; it is **not** the
storefront and it has no database of its own.

## Why `HTTP 503: Storefront backend on port 9449 is offline` happens

The dashboard's login route proxies to `STORE_API_URL`:

```
browser -> admin-dashboard /api/auth/login
        -> STORE_API_URL/api/auth/login
```

If `STORE_API_URL` is missing, the code used to fall back to
`http://127.0.0.1:9449`. On Vercel that address is the serverless function
itself - there is no storefront process listening on port 9449 and
`npm run dev:store` cannot be run inside a Vercel function. The request is
refused and the dashboard returns HTTP 503.

**Fix:** deploy the storefront, then point the dashboard at its public URL.

---

## Project 1 - Storefront (`ai-genrated`)

1. Vercel -> **Add New Project** -> import this repository.
2. **Root Directory:** `ai-genrated`
3. **Framework Preset:** Next.js
4. **Node.js Version:** 24.x (the app uses `node:sqlite`)
5. Add the environment variables below for **Production**:

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | yes | Long random string used to sign `vs_session`. |
| `ADMIN_API_KEY` | yes | Must match the dashboard project. |
| `STORE_ADMIN_KEY` | recommended | Same value as `ADMIN_API_KEY`. |
| `MONGODB_URI` | **yes on Vercel** | MongoDB **Atlas** connection string - not localhost. |
| `MONGODB_DB` | recommended | e.g. `vardayini_sweets`. |
| `MYSQL_*` | optional | Cloud MySQL fallback. |
| `FAST2SMS_API_KEY` | optional | OTP delivery. |
| `ADMIN_SEED_PASSWORD` | optional | Password for the seeded `admin@vardayini.com`. |

6. Deploy. The store's production URL looks like
   `https://<project-name>.vercel.app`.
7. Open `https://<store>.vercel.app/api/health` - it must return `{"ok":true}`.
8. Make sure the storefront project is **not** protected by Vercel
   Authentication in production. The dashboard calls it server-to-server, so a
   login wall returns 401/HTML instead of JSON. If you must keep protection,
   use a Protection Bypass token and send it from the dashboard.

### Persistence warning (important)

On Vercel the filesystem is read-only, so the app falls back to an
**in-memory SQLite database per serverless instance**. Without a remote
MongoDB, everything written by the admin (products, orders, users, settings)
is lost on the next cold start and different requests can see different data.

Set `MONGODB_URI` to a MongoDB Atlas cluster before using the app for real.
The app hydrates from MongoDB when its local cache is empty and syncs writes
back to it.

---

## Project 2 - Admin dashboard (`admin-dashboard`)

1. Vercel -> **Add New Project** -> import the same repository again.
2. **Root Directory:** `admin-dashboard`
3. **Framework Preset:** Next.js
4. Add the environment variables below for **Production**:

| Variable | Required | Notes |
| --- | --- | --- |
| `STORE_API_URL` | **yes** | Server-side storefront URL, e.g. `https://<store>.vercel.app`. No trailing slash needed. |
| `NEXT_PUBLIC_STORE_API` | **yes** | Same URL. Used for preview links/iframes. Inlined at build time. |
| `ADMIN_API_KEY` | **yes** | Must match the storefront project. |
| `STORE_ADMIN_KEY` | recommended | Same value as `ADMIN_API_KEY`. |

5. **Redeploy after changing `NEXT_PUBLIC_STORE_API`** - `NEXT_PUBLIC_*`
   values are baked into the client bundle at build time.
6. Open the dashboard, then log in with the storefront admin account
   (`admin@vardayini.com` / `ADMIN_SEED_PASSWORD`, or the default
   `admin123` when no seed password is set).

---

## Verification checklist

1. `https://<store>.vercel.app/api/health` -> `{"ok":true}`
2. `https://<store>.vercel.app/api/auth/login` (POST JSON credentials) returns
   a user object and a `vs_session` cookie.
3. `https://<admin>.vercel.app/api/diag` -> reports
   `STORE_API_URL.set = true` and `storefront.reachable = true`.
4. Dashboard login succeeds and the overview loads products/orders.

If step 3 shows `STORE_API_URL.set = false`, add the variable and redeploy the
dashboard. If it shows `reachable: false`, fix the storefront deployment or its
Deployment Protection setting.

---

## Local development (unchanged)

```bash
# from the repository root
npm run mongo      # optional local MongoDB
npm run dev        # starts storefront (9449) + admin (3001)
```

Local `.env.local` files may keep using `http://127.0.0.1:9449`; the
production-only guard does not affect `NODE_ENV=development`.
