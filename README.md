# vardayini-1986

Two Next.js apps in one repository:

- `ai-genrated` - storefront + backend API (local port `9449`)
- `admin-dashboard` - admin UI (local port `3001`)

The dashboard is a client of the storefront and must be pointed at it with
`STORE_API_URL` / `NEXT_PUBLIC_STORE_API`.

Deploying both apps to Vercel: see [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md).
