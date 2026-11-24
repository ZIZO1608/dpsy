'use strict';
/* Digital Plus store server: static site + JSON API + web push.
   Data: SQLite (node:sqlite) in DATA_DIR (mount a Coolify volume on /data). */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const webpush = require('web-push');
const { DatabaseSync } = require('node:sqlite');
let sharp = null; try { sharp = require('sharp'); } catch { /* images served unresized */ }

const PORT = +process.env.PORT || 80;
const DATA = path.resolve(process.env.DATA_DIR || '/data');
const SITE = path.resolve(process.env.SITE_DIR || path.join(__dirname, '..', 'site'));
const IMG_ORIGIN = 'https://www.dpsy.com/files/';
fs.mkdirSync(path.join(DATA, 'img'), { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ───────── database ───────── */
const db = new DatabaseSync(path.join(DATA, 'store.db'));
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=4000;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','manager','sales')), pass_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL, series TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0, old_price INTEGER NOT NULL DEFAULT 0, stock TEXT NOT NULL DEFAULT 'in' CHECK(stock IN ('in','out','call')),
  image TEXT NOT NULL DEFAULT '', gallery TEXT NOT NULL DEFAULT '[]', attrs TEXT NOT NULL DEFAULT '{}', specs TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS products_cat ON products(cat, active);
CREATE TABLE IF NOT EXISTS price_history(product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, price INTEGER NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY, phone TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, no TEXT UNIQUE NOT NULL, token TEXT NOT NULL, customer_id INTEGER NOT NULL REFERENCES customers(id),
  method TEXT NOT NULL CHECK(method IN ('delivery','pickup')), city TEXT NOT NULL, area TEXT NOT NULL DEFAULT '', street TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '', staff_note TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','out','delivered','cancelled')),
  total INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS orders_status ON orders(status, created_at);
CREATE TABLE IF NOT EXISTS order_items(order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER, name TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS order_log(order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, at TEXT NOT NULL DEFAULT (datetime('now')), text TEXT NOT NULL, user_id INTEGER);
CREATE TABLE IF NOT EXISTS push_subs(id INTEGER PRIMARY KEY, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('staff','customer')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, lang TEXT NOT NULL DEFAULT 'en', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS order_subs(order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, sub_id INTEGER NOT NULL REFERENCES push_subs(id) ON DELETE CASCADE, PRIMARY KEY(order_id, sub_id));
CREATE TABLE IF NOT EXISTS watches(id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sub_id INTEGER NOT NULL REFERENCES push_subs(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('stock','price')),
  price_at INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(product_id, sub_id, type));
`);
const q = (sql) => db.prepare(sql);
const tx = (fn) => (...a) => { db.exec('BEGIN'); try { const r = fn(...a); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
const getSetting = (k, d = null) => { const r = q('SELECT value FROM settings WHERE key=?').get(k); return r ? r.value : d; };
const setSetting = (k, v) => q('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));

// seed catalog on first boot
if (!q('SELECT COUNT(*) n FROM products').get().n) {
  const ins = q('INSERT INTO products(id,name,cat,series,price,old_price,stock,image,gallery,attrs,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  tx(() => require('./seed').forEach(p => ins.run(p.id, p.name, p.cat, p.series, p.price, p.old_price, p.stock, p.image, JSON.stringify(p.gallery), JSON.stringify(p.attrs), JSON.stringify(p.specs))))();
  log('seeded products');
}
// first owner account from environment (Coolify secrets)
if (!q('SELECT COUNT(*) n FROM users').get().n) {
  if (process.env.ADMIN_USER && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8) {
    q('INSERT INTO users(username,name,role,pass_hash) VALUES(?,?,?,?)').run(process.env.ADMIN_USER.toLowerCase(), 'Owner', 'owner', bcrypt.hashSync(process.env.ADMIN_PASSWORD, 11));
    log('created owner account', process.env.ADMIN_USER);
  } else log('WARNING: no staff accounts. Set ADMIN_USER and ADMIN_PASSWORD (8+ chars) to create the owner.');
}
// web push keys: from env, else generated once and kept in the database
let VAPID = { pub: process.env.VAPID_PUBLIC_KEY || getSetting('vapid_public'), priv: process.env.VAPID_PRIVATE_KEY || getSetting('vapid_private') };
if (!VAPID.pub || !VAPID.priv) { const k = webpush.generateVAPIDKeys(); VAPID = { pub: k.publicKey, priv: k.privateKey }; setSetting('vapid_public', k.publicKey); setSetting('vapid_private', k.privateKey); }
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:info@dpsy.com', VAPID.pub, VAPID.priv);
let mounted = null;
try { mounted = fs.readFileSync('/proc/mounts', 'utf8').split('\n').some(l => l.split(' ')[1] === DATA); } catch { /* not linux */ }
if (mounted === false) log('WARNING: ' + DATA + ' is not a mounted volume — data is lost on every redeploy. Add persistent storage in Coolify.');

/* ───────── helpers ───────── */
const CITIES = ['Damascus', 'Aleppo', 'Homs', 'Hama', 'Latakia', 'Tartus'];
const STATUSES = ['new', 'confirmed', 'out', 'delivered', 'cancelled'];
const parse = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const int = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };
class Bad extends Error { constructor(msg, code = 400) { super(msg); this.code = code; } }
function specLine(p) {
  const a = p.attrs || {};
  switch (p.cat) {
    case 'lap': return [a.cpu && a.cpu.replace('AMD ', ''), a.gpu && a.gpu.replace(/ \d+GB/, ''), a.refresh && a.refresh + 'Hz', a.panel].filter(Boolean).slice(0, 3).join(' · ') || [p.series, a.size && (a.size + '-inch')].filter(Boolean).join(' · ');
    case 'gpu': return [a.model, a.vram && a.vram + 'GB'].filter(Boolean).join(' · ');
    case 'mon': return [a.size && a.size + '-inch', a.res, p.series].filter(Boolean).join(' · ');
    case 'mb': return [a.socket, a.mem].filter(Boolean).join(' · ');
    case 'cpu': return [a.cores && a.cores + ' cores', a.socket].filter(Boolean).join(' · ');
    case 'ram': return [a.capacity && a.capacity + 'GB', a.mem].filter(Boolean).join(' · ');
    default: return a.type || p.series || '';
  }
}
function pub(r) {
  const p = { id: r.id, n: r.name, c: r.cat, se: r.series, p: r.price, o: r.old_price > r.price ? r.old_price : 0, f: r.image, stock: r.stock, attrs: parse(r.attrs, {}), specs: parse(r.specs, {}), gallery: parse(r.gallery, []), upd: r.updated_at.slice(0, 10) };
  p.s = specLine({ cat: p.c, series: p.se, attrs: p.attrs }); if (p.attrs.size) p.sz = p.attrs.size;
  return p;
}
const normPhone = v => { const d = String(v || '').replace(/\D/g, '').replace(/^963/, '').replace(/^(?=9)/, '0'); return /^09\d{8}$/.test(d) ? d : null; };

/* rate limiting (in memory, per IP + bucket) */
const hits = new Map();
function limit(bucket, max, windowMs) {
  return (req, res, next) => {
    const k = bucket + ':' + req.ip, now = Date.now(), h = (hits.get(k) || []).filter(t => now - t < windowMs);
    if (h.length >= max) return res.status(429).json({ error: 'Too many requests. Please wait a little and try again.' });
    h.push(now); hits.set(k, h); next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

/* ───────── push ───────── */
const T = {
  newOrder: { en: (o) => [`New order ${o.no}`, `${o.name} · $${o.total.toLocaleString('en-US')} · ${o.city}`], ar: (o) => [`طلب جديد ${o.no}`, `${o.name} · ${o.total.toLocaleString('en-US')}$ · ${o.city}`] },
  status: {
    en: { confirmed: 'Your order is confirmed', out: 'Your order is on its way', delivered: 'Delivered — thank you!', cancelled: 'Your order was cancelled' },
    ar: { confirmed: 'تم تأكيد طلبك', out: 'طلبك في الطريق إليك', delivered: 'تم التسليم — شكراً لك!', cancelled: 'تم إلغاء طلبك' }
  },
  stock: { en: n => ['Back in stock', n], ar: n => ['عاد متوفراً', n] },
  price: { en: (n, p) => ['Price drop', `${n} — now $${p.toLocaleString('en-US')}`], ar: (n, p) => ['انخفض السعر', `${n} — الآن ${p.toLocaleString('en-US')}$`] }
};
async function sendTo(sub, payload) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: parse(sub.keys, {}) }, JSON.stringify(payload), { TTL: 86400 });
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) q('DELETE FROM push_subs WHERE id=?').run(sub.id);
    else log('push failed', e.statusCode || e.message);
    return false;
  }
}
function notifyStaff(o) {
  for (const s of q("SELECT * FROM push_subs WHERE kind='staff'").all()) {
    const [title, body] = (T.newOrder[s.lang] || T.newOrder.en)(o);
    sendTo(s, { title, body, url: '/store/admin.html#orders/' + o.no, tag: 'order-' + o.no });
  }
}
function notifyOrder(orderId, no, status) {
  for (const s of q('SELECT p.* FROM push_subs p JOIN order_subs os ON os.sub_id=p.id WHERE os.order_id=?').all(orderId)) {
    const t = (T.status[s.lang] || T.status.en)[status]; if (!t) continue;
    sendTo(s, { title: t, body: no, url: '/store/#order/' + no, tag: 'order-' + no });
  }
}
function notifyWatchers(before, after) {
  const name = after.name.replace(/^ASUS /, '');
  if (before.stock !== 'in' && after.stock === 'in') {
    for (const w of q("SELECT w.id wid, p.* FROM watches w JOIN push_subs p ON p.id=w.sub_id WHERE w.product_id=? AND w.type='stock'").all(after.id)) {
      const [title, body] = (T.stock[w.lang] || T.stock.en)(name);
      sendTo(w, { title, body, url: '/store/#product/' + after.id, tag: 'stock-' + after.id });
      q('DELETE FROM watches WHERE id=?').run(w.wid);
    }
  }
  if (after.price > 0 && (before.price === 0 || after.price < before.price)) {
    for (const w of q("SELECT w.id wid, w.price_at, p.* FROM watches w JOIN push_subs p ON p.id=w.sub_id WHERE w.product_id=? AND w.type='price'").all(after.id)) {
      if (w.price_at && after.price >= w.price_at) continue;
      const [title, body] = (T.price[w.lang] || T.price.en)(name, after.price);
      sendTo(w, { title, body, url: '/store/#product/' + after.id, tag: 'price-' + after.id });
      q('UPDATE watches SET price_at=? WHERE id=?').run(after.price, w.wid);
    }
  }
}
function upsertSub(sub, kind, lang, userId) {
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000 || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw new Bad('Invalid subscription');
  const l = lang === 'ar' ? 'ar' : 'en';
  q(`INSERT INTO push_subs(endpoint,keys,kind,user_id,lang) VALUES(?,?,?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET keys=excluded.keys, lang=excluded.lang, kind=CASE WHEN excluded.kind='staff' THEN 'staff' ELSE push_subs.kind END, user_id=COALESCE(excluded.user_id, push_subs.user_id)`)
    .run(sub.endpoint, JSON.stringify({ p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100) }), kind, userId || null, l);
  return q('SELECT * FROM push_subs WHERE endpoint=?').get(sub.endpoint);
}

/* ───────── exchange rate ───────── */
function getPath(obj, p) { return String(p || '').split('.').filter(Boolean).reduce((o, k) => o == null ? undefined : o[k], obj); }
async function refreshRate() {
  const url = process.env.EXCHANGE_API_URL; if (!url) return { ok: false, error: 'EXCHANGE_API_URL is not set' };
  try {
    const key = process.env.EXCHANGE_API_KEY || '';
    const headers = { accept: 'application/json' };
    if (key && process.env.EXCHANGE_API_KEY_HEADER) headers[process.env.EXCHANGE_API_KEY_HEADER] = key;
    const r = await fetch(url.replace('{KEY}', encodeURIComponent(key)), { headers, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json();
    const rate = Number(getPath(body, process.env.EXCHANGE_JSON_PATH || 'rate'));
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('No rate at path ' + (process.env.EXCHANGE_JSON_PATH || 'rate'));
    const prev = Number(getSetting('rate', 0));
    if (prev && Math.abs(rate - prev) / prev > 0.3) { setSetting('rate_pending', rate); return { ok: false, error: `Rate ${rate} differs more than 30% from ${prev}; confirm it in the admin` }; }
    setSetting('rate', rate); setSetting('rate_at', new Date().toISOString()); setSetting('rate_source', 'api'); q("DELETE FROM settings WHERE key='rate_pending'").run();
    return { ok: true, rate };
  } catch (e) { log('rate refresh failed', e.message); return { ok: false, error: e.message }; }
}
if (process.env.EXCHANGE_API_URL) { refreshRate(); setInterval(refreshRate, (+process.env.EXCHANGE_REFRESH_MIN || 60) * 60e3).unref(); }

/* ───────── app ───────── */
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(compression());
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'X-Robots-Tag': process.env.ALLOW_INDEX ? 'all' : 'noindex, nofollow' });
  next();
});
app.get('/healthz', (req, res) => { try { q('SELECT 1').get(); res.type('text').send('ok'); } catch { res.status(500).send('db'); } });
app.get('/robots.txt', (req, res) => res.type('text').send(process.env.ALLOW_INDEX ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n'));

// private preview: browser password on everything except health, worker and app icons
const PU = process.env.PREVIEW_USER, PP = process.env.PREVIEW_PASSWORD;
if (process.env.REQUIRE_PREVIEW_AUTH === '1' && !(PU && PP) && process.env.ALLOW_PUBLIC !== '1') {
  console.error('Refusing to start: set PREVIEW_USER and PREVIEW_PASSWORD (or ALLOW_PUBLIC=1 when the store goes public).');
  process.exit(1);
}
const OPEN = /^\/(healthz|robots\.txt|sw\.js|store\/manifest\.webmanifest|store\/admin\.webmanifest|assets\/icons\/)/;
if (PU && PP) {
  const want = Buffer.from(PU + ':' + PP);
  app.use((req, res, next) => {
    if (OPEN.test(req.path)) return next();
    const h = req.headers.authorization || '';
    const got = h.startsWith('Basic ') ? Buffer.from(h.slice(6), 'base64') : Buffer.alloc(0);
    if (got.length === want.length && crypto.timingSafeEqual(got, want)) return next();
    res.set('WWW-Authenticate', 'Basic realm="Digital Plus preview", charset="UTF-8"').status(401).send('Password required');
  });
}

app.use('/api', express.json({ limit: '6mb' }));
// CSRF guard for writes: JSON only, same origin
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (!req.is('application/json')) return res.status(415).json({ error: 'JSON required' });
  const o = req.headers.origin; if (o) { try { if (new URL(o).host !== req.headers.host) return res.status(403).json({ error: 'Cross-site request blocked' }); } catch { return res.status(403).json({ error: 'Bad origin' }); } }
  next();
});

/* auth */
function readUser(req) {
  const m = /(?:^|;\s*)dps=([a-f0-9]{64})/.exec(req.headers.cookie || ''); if (!m) return null;
  const s = q('SELECT u.id,u.username,u.name,u.role,u.active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(sha(m[1]));
  if (!s || !s.active || s.expires_at < Date.now()) return null;
  return s;
}
const auth = (...roles) => (req, res, next) => {
  const u = readUser(req); if (!u) return res.status(401).json({ error: 'Please sign in' });
  if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'Your role cannot do this' });
  req.user = u; next();
};
const cookie = (req, val, maxAge) => `dps=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;
app.post('/api/auth/login', limit('login', 8, 15 * 60e3), (req, res) => {
  const u = q('SELECT * FROM users WHERE username=? AND active=1').get(clean(req.body.username, 60).toLowerCase());
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.pass_hash)) return res.status(401).json({ error: 'Wrong username or password' });
  const token = crypto.randomBytes(32).toString('hex');
  q('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(sha(token), u.id, Date.now() + 14 * 864e5);
  q('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
  res.set('Set-Cookie', cookie(req, token, 14 * 86400)).json({ user: { id: u.id, username: u.username, name: u.name, role: u.role } });
});
app.post('/api/auth/logout', (req, res) => {
  const m = /(?:^|;\s*)dps=([a-f0-9]{64})/.exec(req.headers.cookie || ''); if (m) q('DELETE FROM sessions WHERE token_hash=?').run(sha(m[1]));
  res.set('Set-Cookie', cookie(req, '', 0)).json({ ok: true });
});
app.get('/api/auth/me', (req, res) => { const u = readUser(req); res.json({ user: u ? { id: u.id, username: u.username, name: u.name, role: u.role } : null, hasUsers: !!q('SELECT COUNT(*) n FROM users').get().n }); });

/* public catalog */
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(q('SELECT * FROM products WHERE active=1 ORDER BY cat, price=0, id DESC').all().map(pub));
});
app.get('/api/settings/public', (req, res) => {
  res.json({ rate: Number(getSetting('rate', 0)) || 0, rate_at: getSetting('rate_at'), push_key: VAPID.pub });
});

/* orders */
const createOrder = tx((b, ip) => {
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!items.length) throw new Bad('Your cart is empty');
  const name = clean(b.name, 80); if (name.length < 2) throw new Bad('Please enter your name');
  const phone = normPhone(b.phone); if (!phone) throw new Bad('Please enter a Syrian mobile number');
  const method = b.method === 'pickup' ? 'pickup' : 'delivery';
  const city = method === 'pickup' ? (['Damascus', 'Aleppo'].includes(b.branch) ? b.branch : 'Damascus') : (CITIES.includes(b.city) ? b.city : null);
  if (!city) throw new Bad('Please choose a city');
  const area = clean(b.area, 80); if (method === 'delivery' && area.length < 2) throw new Bad('Please enter your area');
  const lines = [];
  for (const it of items) {
    const qty = Math.min(20, Math.max(1, int(it.qty, 1)));
    if (it.custom) { // a PC build from the builder: parts listed, priced from the catalog when known
      const parts = Array.isArray(it.parts) ? it.parts.slice(0, 12).map(p => clean(p, 120)) : [];
      lines.push({ product_id: null, name: clean('Custom PC build: ' + parts.join(' + '), 600), qty, price: Math.max(0, int(it.price)) });
      continue;
    }
    const p = q('SELECT * FROM products WHERE id=? AND active=1').get(int(it.id));
    if (!p) throw new Bad('A product in your cart is no longer available');
    if (p.stock === 'out') throw new Bad(`${p.name} is out of stock`);
    lines.push({ product_id: p.id, name: p.name, qty, price: p.price });
  }
  let cust = q('SELECT * FROM customers WHERE phone=?').get(phone);
  if (!cust) { q('INSERT INTO customers(phone,name) VALUES(?,?)').run(phone, name); cust = q('SELECT * FROM customers WHERE phone=?').get(phone); }
  else q('UPDATE customers SET name=? WHERE id=?').run(name, cust.id);
  const d = new Date(), stamp = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  let no; do { no = `DP-${stamp}-${crypto.randomInt(1000, 9999)}`; } while (q('SELECT 1 FROM orders WHERE no=?').get(no));
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const token = crypto.randomBytes(12).toString('hex');
  const r = q('INSERT INTO orders(no,token,customer_id,method,city,area,street,notes,lang,total) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(no, token, cust.id, method, city, method === 'delivery' ? area : '', method === 'delivery' ? clean(b.street, 160) : '', clean(b.notes, 500), b.lang === 'ar' ? 'ar' : 'en', total);
  const oid = Number(r.lastInsertRowid);
  const insI = q('INSERT INTO order_items(order_id,product_id,name,qty,price) VALUES(?,?,?,?,?)');
  lines.forEach(l => insI.run(oid, l.product_id, l.name, l.qty, l.price));
  q('INSERT INTO order_log(order_id,text) VALUES(?,?)').run(oid, 'Order placed on the website');
  if (lines.some(l => l.product_id === null)) q('INSERT INTO order_log(order_id,text) VALUES(?,?)').run(oid, 'Includes a custom PC build: check parts and price on the call');
  return { id: oid, no, token, total, name, city, lines };
});
app.post('/api/orders', limit('order', 8, 3600e3), (req, res) => {
  const o = createOrder(req.body || {}, req.ip);
  log('order', o.no, o.total);
  notifyStaff(o);
  res.status(201).json({ no: o.no, token: o.token, total: o.total, items: o.lines });
});
function orderView(o, staff) {
  const c = q('SELECT * FROM customers WHERE id=?').get(o.customer_id);
  const v = {
    no: o.no, status: o.status, method: o.method, city: o.city, area: o.area, street: o.street, notes: o.notes, total: o.total,
    created_at: o.created_at, updated_at: o.updated_at, name: c.name,
    items: q('SELECT product_id id,name,qty,price FROM order_items WHERE order_id=?').all(o.id),
    log: q('SELECT at,text FROM order_log WHERE order_id=? ORDER BY at').all(o.id)
  };
  if (staff) Object.assign(v, { phone: c.phone, staff_note: o.staff_note, lang: o.lang, subs: q('SELECT COUNT(*) n FROM order_subs WHERE order_id=?').get(o.id).n });
  return v;
}
app.get('/api/orders/:no', limit('track', 60, 600e3), (req, res) => {
  const o = q('SELECT * FROM orders WHERE no=?').get(clean(req.params.no, 30));
  if (!o || !req.query.t || String(req.query.t) !== o.token) return res.status(404).json({ error: 'Order not found' });
  res.json(orderView(o, false));
});

/* push subscriptions */
app.get('/api/push/key', (req, res) => res.json({ key: VAPID.pub }));
app.post('/api/push/subscribe', limit('sub', 30, 600e3), (req, res) => {
  const b = req.body || {};
  if (b.kind === 'staff') {
    const u = readUser(req); if (!u) return res.status(401).json({ error: 'Please sign in' });
    const s = upsertSub(b.subscription, 'staff', b.lang, u.id); return res.json({ ok: true, id: s.id });
  }
  const s = upsertSub(b.subscription, 'customer', b.lang, null);
  if (b.order) {
    const o = q('SELECT id,token FROM orders WHERE no=?').get(clean(b.order, 30));
    if (!o || o.token !== String(b.token || '')) throw new Bad('Order not found', 404);
    q('INSERT OR IGNORE INTO order_subs(order_id,sub_id) VALUES(?,?)').run(o.id, s.id);
  }
  res.json({ ok: true });
});
app.post('/api/push/unsubscribe', (req, res) => { q('DELETE FROM push_subs WHERE endpoint=?').run(String((req.body || {}).endpoint || '')); res.json({ ok: true }); });
app.post('/api/watch', limit('watch', 30, 600e3), (req, res) => {
  const b = req.body || {};
  const p = q('SELECT id,price FROM products WHERE id=? AND active=1').get(int(b.productId)); if (!p) throw new Bad('Product not found', 404);
  const type = b.type === 'price' ? 'price' : 'stock';
  const s = upsertSub(b.subscription, 'customer', b.lang, null);
  q('INSERT INTO watches(product_id,sub_id,type,price_at) VALUES(?,?,?,?) ON CONFLICT(product_id,sub_id,type) DO UPDATE SET price_at=excluded.price_at').run(p.id, s.id, type, p.price);
  res.json({ ok: true });
});
app.post('/api/push/test', auth(), async (req, res) => {
  const subs = q('SELECT * FROM push_subs WHERE user_id=?').all(req.user.id);
  let sent = 0; for (const s of subs) if (await sendTo(s, { title: 'Digital Plus', body: s.lang === 'ar' ? 'الإشعارات تعمل على هذا الجهاز' : 'Notifications work on this device', url: '/store/admin.html' })) sent++;
  res.json({ ok: true, sent });
});

/* ───────── staff API ───────── */
app.get('/api/admin/orders', auth(), (req, res) => {
  res.json(q('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all().map(o => orderView(o, true)));
});
const NEXT = { new: ['confirmed', 'cancelled'], confirmed: ['out', 'cancelled'], out: ['delivered'], delivered: [], cancelled: [] };
app.patch('/api/admin/orders/:no', auth(), (req, res) => {
  const o = q('SELECT * FROM orders WHERE no=?').get(clean(req.params.no, 30)); if (!o) throw new Bad('Order not found', 404);
  const b = req.body || {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status) || !NEXT[o.status].includes(b.status)) throw new Bad(`Cannot change ${o.status} to ${b.status}`);
    q("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?").run(b.status, o.id);
    const words = { confirmed: 'Confirmed after call', out: 'Sent out for delivery', delivered: 'Delivered, cash received', cancelled: 'Cancelled' };
    q('INSERT INTO order_log(order_id,text,user_id) VALUES(?,?,?)').run(o.id, `${words[b.status]} · ${req.user.name}`, req.user.id);
    notifyOrder(o.id, o.no, b.status);
  }
  if (b.staff_note !== undefined) { q("UPDATE orders SET staff_note=?, updated_at=datetime('now') WHERE id=?").run(clean(b.staff_note, 1000), o.id); q('INSERT INTO order_log(order_id,text,user_id) VALUES(?,?,?)').run(o.id, 'Note updated · ' + req.user.name, req.user.id); }
  res.json(orderView(q('SELECT * FROM orders WHERE id=?').get(o.id), true));
});
app.get('/api/admin/products', auth(), (req, res) => {
  const w = {}; q('SELECT product_id, type, COUNT(*) n FROM watches GROUP BY product_id, type').all().forEach(r => { (w[r.product_id] = w[r.product_id] || {})[r.type] = r.n; });
  res.json(q('SELECT * FROM products ORDER BY cat, id DESC').all().map(r => Object.assign(pub(r), { active: !!r.active, watch: w[r.id] || {} })));
});
function applyProduct(before, f, userName) {
  const after = Object.assign({}, before, f);
  q("UPDATE products SET name=?,cat=?,series=?,price=?,old_price=?,stock=?,image=?,gallery=?,attrs=?,specs=?,active=?,updated_at=datetime('now') WHERE id=?")
    .run(after.name, after.cat, after.series, after.price, after.old_price, after.stock, after.image, after.gallery, after.attrs, after.specs, after.active, after.id);
  if (after.price !== before.price) q('INSERT INTO price_history(product_id,price) VALUES(?,?)').run(after.id, after.price);
  notifyWatchers(before, after);
  return after;
}
const STOCK = ['in', 'out', 'call'], CATS = ['lap', 'gpu', 'mon', 'mb', 'cpu', 'ram', 'acc'];
app.patch('/api/admin/products/:id', auth('owner', 'manager'), (req, res) => {
  const before = q('SELECT * FROM products WHERE id=?').get(int(req.params.id)); if (!before) throw new Bad('Product not found', 404);
  const b = req.body || {}, f = {};
  if (b.price !== undefined) f.price = Math.max(0, int(b.price));
  if (b.old_price !== undefined) f.old_price = Math.max(0, int(b.old_price));
  if (b.stock !== undefined) { if (!STOCK.includes(b.stock)) throw new Bad('Bad stock value'); f.stock = b.stock; }
  if (b.active !== undefined) f.active = b.active ? 1 : 0;
  res.json(pub(applyProduct(before, f, req.user.name)));
});
const importRows = tx((rows) => {
  const out = { created: 0, updated: 0, unchanged: 0, skipped: [] };
  rows.slice(0, 5000).forEach((r, i) => {
    const name = clean(r.name, 200), id = int(r.id, 0);
    const ex = id ? q('SELECT * FROM products WHERE id=?').get(id) : (name ? q('SELECT * FROM products WHERE lower(name)=lower(?)').get(name) : null);
    const price = r.price === undefined || r.price === '' ? (ex ? ex.price : 0) : Math.max(0, int(String(r.price).replace(/[^\d.]/g, '')));
    const old = r.old_price === undefined || r.old_price === '' ? (ex ? ex.old_price : 0) : Math.max(0, int(String(r.old_price).replace(/[^\d.]/g, '')));
    let stock = String(r.stock || '').toLowerCase().trim(); stock = STOCK.includes(stock) ? stock : (ex ? ex.stock : (price ? 'in' : 'call'));
    const attrs = Object.assign(ex ? parse(ex.attrs, {}) : {}, r.attrs && typeof r.attrs === 'object' ? r.attrs : {});
    const specs = Object.assign(ex ? parse(ex.specs, {}) : {}, r.specs && typeof r.specs === 'object' ? r.specs : {});
    const image = clean(r.image, 500) || (ex ? ex.image : '');
    if (ex) {
      const f = { name: name || ex.name, cat: CATS.includes(r.cat) ? r.cat : ex.cat, series: clean(r.series, 60) || ex.series, price, old_price: old, stock, image, attrs: JSON.stringify(attrs), specs: JSON.stringify(specs), gallery: image !== ex.image ? JSON.stringify([image]) : ex.gallery };
      const changed = Object.keys(f).some(k => String(f[k]) !== String(ex[k]));
      if (changed) { applyProduct(ex, f); out.updated++; } else out.unchanged++;
    } else {
      if (!name || !CATS.includes(r.cat)) { out.skipped.push({ row: i + 2, reason: !name ? 'no name' : 'unknown category' }); return; }
      const nid = id || (q('SELECT COALESCE(MAX(id),0)+1 n FROM products').get().n);
      q('INSERT INTO products(id,name,cat,series,price,old_price,stock,image,gallery,attrs,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .run(nid, name, r.cat, clean(r.series, 60), price, old, stock, image, JSON.stringify(image ? [image] : []), JSON.stringify(attrs), JSON.stringify(specs));
      out.created++;
    }
  });
  return out;
});
app.post('/api/admin/products/import', auth('owner', 'manager'), (req, res) => {
  const rows = Array.isArray((req.body || {}).rows) ? req.body.rows : null; if (!rows) throw new Bad('No rows');
  const r = importRows(rows); log('import by', req.user.username, JSON.stringify({ created: r.created, updated: r.updated }));
  res.json(r);
});
app.get('/api/admin/settings', auth(), (req, res) => res.json({
  rate: Number(getSetting('rate', 0)) || 0, rate_at: getSetting('rate_at'), rate_source: getSetting('rate_source'), rate_pending: getSetting('rate_pending'),
  rate_api: !!process.env.EXCHANGE_API_URL, data_persistent: mounted, push_key: VAPID.pub,
  staff_devices: q("SELECT COUNT(*) n FROM push_subs WHERE kind='staff'").get().n, customer_devices: q("SELECT COUNT(*) n FROM push_subs WHERE kind='customer'").get().n
}));
app.put('/api/admin/settings/rate', auth('owner', 'manager'), (req, res) => {
  const rate = Number((req.body || {}).rate); if (!Number.isFinite(rate) || rate <= 0 || rate > 1e7) throw new Bad('Enter a valid rate');
  setSetting('rate', rate); setSetting('rate_at', new Date().toISOString()); setSetting('rate_source', 'manual · ' + req.user.name); q("DELETE FROM settings WHERE key='rate_pending'").run();
  res.json({ ok: true, rate });
});
app.post('/api/admin/settings/rate/refresh', auth('owner', 'manager'), async (req, res) => res.json(await refreshRate()));
app.get('/api/admin/users', auth('owner'), (req, res) => res.json(q('SELECT id,username,name,role,active,created_at FROM users ORDER BY id').all()));
app.post('/api/admin/users', auth('owner'), (req, res) => {
  const b = req.body || {}, username = clean(b.username, 40).toLowerCase(), name = clean(b.name, 60);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Bad('Username: 3–40 letters, numbers, dot, dash');
  if (!['owner', 'manager', 'sales'].includes(b.role)) throw new Bad('Choose a role');
  if (String(b.password || '').length < 8) throw new Bad('Password must be at least 8 characters');
  if (q('SELECT 1 FROM users WHERE username=?').get(username)) throw new Bad('That username is taken');
  q('INSERT INTO users(username,name,role,pass_hash) VALUES(?,?,?,?)').run(username, name || username, b.role, bcrypt.hashSync(String(b.password), 11));
  res.status(201).json({ ok: true });
});
app.patch('/api/admin/users/:id', auth('owner'), (req, res) => {
  const u = q('SELECT * FROM users WHERE id=?').get(int(req.params.id)); if (!u) throw new Bad('User not found', 404);
  const b = req.body || {};
  const owners = q("SELECT COUNT(*) n FROM users WHERE role='owner' AND active=1").get().n;
  const losingOwner = u.role === 'owner' && u.active && ((b.role && b.role !== 'owner') || b.active === false);
  if (losingOwner && owners <= 1) throw new Bad('Keep at least one active owner');
  if (b.role) { if (!['owner', 'manager', 'sales'].includes(b.role)) throw new Bad('Bad role'); q('UPDATE users SET role=? WHERE id=?').run(b.role, u.id); }
  if (b.active !== undefined) { q('UPDATE users SET active=? WHERE id=?').run(b.active ? 1 : 0, u.id); if (!b.active) q('DELETE FROM sessions WHERE user_id=?').run(u.id); }
  if (b.password) { if (String(b.password).length < 8) throw new Bad('Password must be at least 8 characters'); q('UPDATE users SET pass_hash=? WHERE id=?').run(bcrypt.hashSync(String(b.password), 11), u.id); q('DELETE FROM sessions WHERE user_id=?').run(u.id); }
  res.json({ ok: true });
});
app.post('/api/admin/me/password', auth(), (req, res) => {
  const b = req.body || {}, u = q('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(String(b.current || ''), u.pass_hash)) throw new Bad('Current password is wrong');
  if (String(b.password || '').length < 8) throw new Bad('New password must be at least 8 characters');
  q('UPDATE users SET pass_hash=? WHERE id=?').run(bcrypt.hashSync(String(b.password), 11), u.id);
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err instanceof Bad) return res.status(err.code).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File too large' });
  log('error', req.method, req.path, err.stack || err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

/* ───────── images: resized + cached WebP of dpsy.com product photos ───────── */
const inflight = new Map();
app.get('/img/:file', async (req, res, next) => {
  const file = req.params.file;
  if (!/^[\w-]{3,80}\.(png|jpe?g|webp)$/i.test(file)) return res.status(404).end();
  const w = [160, 320, 480, 640, 960, 1280].find(x => x >= int(req.query.w, 640)) || 1280;
  if (!sharp) return res.redirect(302, IMG_ORIGIN + file);
  const out = path.join(DATA, 'img', `${w}-${file}.webp`);
  try {
    if (!fs.existsSync(out)) {
      if (!inflight.has(out)) inflight.set(out, (async () => {
        const r = await fetch(IMG_ORIGIN + file, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error('upstream ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toFile(out + '.tmp');
        fs.renameSync(out + '.tmp', out);
      })().finally(() => inflight.delete(out)));
      await inflight.get(out);
    }
    res.set('Cache-Control', 'public, max-age=2592000, immutable').type('image/webp').sendFile(out);
  } catch (e) { log('img', file, e.message); res.redirect(302, IMG_ORIGIN + file); }
});

/* ───────── static site ───────── */
app.get('/sw.js', (req, res) => res.set({ 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }).sendFile(path.join(SITE, 'sw.js')));
app.use(express.static(SITE, {
  extensions: ['html'],
  setHeaders(res, p) {
    if (/\.(html|webmanifest)$/.test(p)) res.set('Cache-Control', 'no-cache');
    else if (/\.(jpg|jpeg|png|webp|svg|pdf|woff2?)$/.test(p)) res.set('Cache-Control', 'public, max-age=604800');
    else res.set('Cache-Control', 'public, max-age=3600');
    if (p.endsWith('.webmanifest')) res.type('application/manifest+json');
  }
}));
app.use((req, res) => res.status(404).type('text').send('Not found'));

app.listen(PORT, () => log(`Digital Plus store on :${PORT} · data ${DATA}${mounted === false ? ' (NOT persistent)' : ''} · images ${sharp ? 'resized' : 'direct'}`));
