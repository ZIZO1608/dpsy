# Digital Plus — new online store preview

A private, password-protected preview of a redesigned online store for **Digital Plus** (dpsy.com): the store, the staff admin, and the proposal (Arabic + English).

> Design concept — not the live store. Product names, prices and photos come from dpsy.com; photos are fetched from their site, resized and cached.

## What's inside

| Path | What it is |
|---|---|
| `server/` | Node app: JSON API, SQLite database, staff logins, push notifications, image resizer. Serves `site/`. |
| `site/store/index.html` | Store: home, category pages with filters, product pages, compare, PC Builder, cart, checkout, order tracking. Installable as an app. |
| `site/store/admin.html` | Staff admin: sign-in, orders, products & prices, Excel import, team & roles, dollar rate, order alerts. Installable as "DP Staff". |
| `site/sw.js` | Service worker: offline pages, image cache, notifications |
| `site/proposal/` | Proposal pages (EN / AR) and PDFs |

Opened as plain files (no server), the store and admin fall back to built-in demo data.

## Features

- **Categories** — `#shop/lap`, `gpu`, `mon`, `mb`, `cpu`, `ram`, `acc`, `deals`; filters are built from each category's own data (GPU maker, VRAM, socket, screen size…).
- **Compare** — `#compare/1672,1671`: side by side, best value marked, "only differences", WhatsApp share, PDF.
- **SYP prices** — every price also shows in Syrian pounds from the rate set in the admin or fetched from a rate API.
- **Orders** — checkout saves to the database; totals are computed on the server. Customers can track at `#order/<no>`.
- **Notifications** — staff get a push for every new order; customers can follow their order and set back-in-stock / price-drop alerts. On iPhone this needs the site added to the home screen (iOS 16.4+).
- **Roles** — owner (everything, incl. team), manager (orders, prices, imports, banners), sales (orders only).
- **Import** — Excel/CSV with `id` or `name`, `price`, optional `old_price`, `stock`, `category`, `series`, `image` (photo link or dpsy file name), plus any spec columns. New names with a category become new products.

## Deploy (Coolify)

Build pack **Dockerfile**, port `80`, health check `/healthz`, domain `https://dpsy.ahmad-zaven.io`.

**Persistent storage (required):** add a volume mounted at **`/data`**. Without it, orders and accounts are wiped on every deploy (the admin shows a warning).

**Environment variables** (mark secrets as secret):

| Variable | Needed | What it does |
|---|---|---|
| `PREVIEW_USER`, `PREVIEW_PASSWORD` | yes | Browser password on the whole preview. The app refuses to start without them. |
| `ADMIN_USER`, `ADMIN_PASSWORD` | first boot | Creates the first owner login (password 8+ characters). Only used while no accounts exist. |
| `EXCHANGE_API_URL` | optional | Rate service URL. `{KEY}` in the URL is replaced with `EXCHANGE_API_KEY`. |
| `EXCHANGE_JSON_PATH` | optional | Where the rate is in the JSON reply, e.g. `rates.SYP` or `data.sell` (default `rate`). |
| `EXCHANGE_API_KEY`, `EXCHANGE_API_KEY_HEADER` | optional | API key, sent in the URL (`{KEY}`) or in the named header. |
| `EXCHANGE_REFRESH_MIN` | optional | Minutes between rate updates (default 60). A jump over 30% waits for confirmation in the admin. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional | Push keys. If unset they are generated once and kept in the database. |
| `ALLOW_PUBLIC`, `ALLOW_INDEX` | at launch | `1` to drop the preview password / allow search engines when the store goes public. |

**Rate service in use:** Syrian Currency API, which replies `{"success":true,"currency":"USD","buy":14850,"sell":14800}`. Set `EXCHANGE_API_URL=https://aumzkcizwfnvnncggfpq.supabase.co/functions/v1/exchange-rates`, `EXCHANGE_JSON_PATH=buy`, `EXCHANGE_API_KEY_HEADER=x-api-key`, and the key (starts `sk_`, from the API site's dashboard) in `EXCHANGE_API_KEY` as a secret.

## Run locally

```
cd server
npm install
DATA_DIR=./data PORT=5181 ADMIN_USER=owner ADMIN_PASSWORD=<8+ chars> node index.js
```

Then open http://localhost:5181/store/ and http://localhost:5181/store/admin.html.
