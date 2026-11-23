# Digital Plus (dpsy.com) — Teardown & "Do It Better" Plan
_Checked 23 Nov 2026 — homepage, product/order page, Build Your PC, category page, mobile view, robots.txt_

## 1. What they are
- **Digital Plus – Systems & Solutions**, a computer-hardware retailer in Syria (Damascus + Aleppo), mostly **ASUS** (laptops, GPUs, motherboards, monitors) plus Lexar etc.
- About 1,700 product IDs (`/ordering/1687` is the newest).
- Prices in **USD**, some with a strikethrough discount (-5% to -30%).
- **No cart and no online payment.** Every product goes to an "Ordering product" form (city, address, map location, name, mobile, note). Staff then call to confirm stock. A WhatsApp button sits on every product.
- English + Arabic (`/en/`, `/ar/`).
- Pages: Home, Products (category + sub-category filter `?c=3&s=32`), Build your PC, Special Offers, Wishlist, Compare, Contact, About, Join Us, Where to buy.
- Delivery cities: Aleppo, Damascus, Hama, Homs, Latakia, Tartus.

## 2. Tech stack (why it feels old)
| Thing | What they use | Problem |
|---|---|---|
| Frontend | jQuery **2.1.1** (2014), Bootstrap 3, Owl Carousel, Select2 | Slow, dated look, known jQuery security issues |
| Analytics | old `analytics.js` (Universal Analytics, **shut down 2023–24**) | They are probably tracking **nothing** |
| SEO | no `<h1>`, no `lang` attribute, no JSON-LD product schema, the same title "Digital Plus :: Systems & Solutions" on every page, keyword-stuffed meta description | Weak Google ranking, no price/stock rich results |
| URLs | `/products/?&c=3&s=32`, `/ordering/1687` | No product names in URLs, bad for SEO and sharing |
| Social preview | `og:image` = the logo on every page | WhatsApp/Facebook shares show the logo instead of the product |

## 3. UX weak spots we can beat
1. **Product pages are dated.** They exist (`/product/1672`, with gallery, spec table and comments), but there's no add-to-cart, only WhatsApp. The "Compare this product with" box dumps **50 laptop names in one list**, and the "Order" button leads to a separate form page.
2. **No cart.** You can't order a laptop and a mouse together, and Build-your-PC only gives you a "Print" button.
3. **Build Your PC has no compatibility check.** You can pick an AM5 CPU with an LGA1851 board, and there's no PSU wattage calculation.
4. **Mobile:** the floating WhatsApp button covers the search bar, the carousel images load blank at first, and the category menu is a long accordion.
5. **Search** is a plain box with no instant results, filters (price, brand, RAM, GPU) or sorting.
6. **"Call us" instead of prices** on some items, plus "we'll call you to confirm availability". The stock status isn't trusted.
7. Trust signals are thin. There are no reviews, warranty explanation page, store photos or map embed.
8. The design is generic: an 2014-era Bootstrap template, a cramped left sidebar and dense tiny text.

## 4. Our version — feature plan
### Phase 1 — Core store (MVP)
- Modern stack: **Next.js + Tailwind + shadcn** (or Lovable for speed), Postgres (Supabase).
- Real **product pages**: gallery, spec table, warranty, stock badge, "last updated", related items, SEO URL like `/laptops/asus-tuf-a15-fa506ncg`.
- **Cart + checkout** that still fits the Syrian market: cash on delivery, pick-up at store, and an "Order via WhatsApp" button that sends the **whole cart** as a pre-filled message.
- Fast **search with filters**: brand, price range, CPU, GPU, RAM, screen size, in-stock only, and sort.
- **Arabic-first, RTL done properly**, with an English toggle. Show prices in USD with an optional SYP rate.
- Mobile-first layout with a bottom nav (Home, Categories, Search, Cart, WhatsApp).

### Phase 2 — Things they don't have at all
- **Smart PC Builder:** socket/RAM/size compatibility rules, PSU wattage estimate, performance tier ("1080p / 1440p / 4K gaming"), share-link + one-click "send build on WhatsApp".
- **Compare** side-by-side spec table (they have `/compare` but it's basic).
- **Price-drop / back-in-stock alerts** by WhatsApp or email.
- **Wishlist** synced to an account (phone number + OTP login).
- **Order tracking** page (Received → Confirmed → Out for delivery → Delivered).

### Phase 3 — Professional polish
- SEO: unique titles, `<h1>`, **Product JSON-LD** (price, availability), sitemap.xml, per-product OG image.
- GA4 + Meta Pixel + Search Console.
- Trust: customer reviews, warranty/RMA page, branch pages with maps and hours, "authorized ASUS partner" badge (only if true for us).
- Admin panel: bulk price update from Excel (USD rate changes often), stock toggle, discounts, banners, order inbox.
- Performance target: Lighthouse 90+ on mobile, images in WebP/AVIF, lazy-loaded.

## 5. About scraping "all the data"
Their robots.txt (Cloudflare-managed) says `ai-train=no`, `use=reference`, and **blocks ClaudeBot / anthropic-ai** by name. So I did **not** bulk-download their catalog. I only browsed a few pages to study the site, which is what this plan is built on.
- **Fine to do:** study their features, categories, price levels and UX by hand (what we did), and watch a handful of competitor prices by hand.
- **Don't do:** copy their product photos, descriptions or banners. Those are theirs or ASUS's.
- **Better source for our catalog:** official **ASUS / Lexar spec sheets and press images** (usually allowed for resellers), our own supplier price lists, and our own photos.

## 6. Suggested next steps
1. Decide: are we building **our own store**, or pitching this redesign **to Digital Plus as a client**? It changes the branding and catalog plan.
2. Build a **clickable homepage + product page + PC builder** prototype (1–2 days).
3. Set up the product database schema + admin import from Excel.
