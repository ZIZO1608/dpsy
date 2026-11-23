# Digital Plus — new online store preview

A private, password-protected preview of a redesigned online store for **Digital Plus** (dpsy.com), with the staff admin and the proposal (Arabic + English).

> Design concept only — not the live store. Product names, prices and photos come from dpsy.com; photos are loaded from their site.

## What's inside

| Path | What it is |
|---|---|
| `site/index.html` | Landing page for the client: links to everything, Arabic / English |
| `site/store/index.html` | Store prototype: home, Gaming Zone, shop + filters, product page, Smart PC Builder, cart, 3-step checkout |
| `site/store/admin.html` | Staff admin: orders inbox, products & prices, Excel price update, banners & deal of the day |
| `site/proposal/` | Proposal pages (EN / AR) and PDFs |
| `docs/` | Site teardown and design direction |
| `Dockerfile`, `nginx/`, `docker-entrypoint.d/` | nginx container with password protection |

Demo shortcuts: `store/?demo=ar` (Arabic), `store/?demo=build#builder` (a full PC build), `store/?demo=checkout#checkout`, `store/admin.html?demo=order`.

## Deploy (Coolify)

1. Coolify → **New Resource → Application** → this GitHub repo, branch `main`, build pack **Dockerfile**.
2. **Domain:** `https://dpsy.ahmad-zaven.io` (Coolify issues the SSL certificate). Port: `80`.
3. **Environment variables** (mark as secret): `PREVIEW_USER`, `PREVIEW_PASSWORD`. The container refuses to start without them.
4. **Health check path:** `/healthz`.
5. Deploy. Every push to `main` can redeploy automatically (enable "Auto deploy").

DNS (Hostinger): `A` record `dpsy` → `152.239.114.129`.

## Run locally

Open `site/index.html` in a browser, or serve the folder: `npx http-server site -p 5178`.
