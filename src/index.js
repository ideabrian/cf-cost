// cf-cost: Cloudflare spend command & control. One page, Basic auth, live from the billing API.
const API = 'https://api.cloudflare.com/client/v4/accounts/';

async function cf(env, path) {
  const r = await fetch(API + env.CF_ACCOUNT_ID + path, { headers: { Authorization: 'Bearer ' + env.CF_BILLING_TOKEN } });
  const j = await r.json();
  if (!j.success && !Array.isArray(j.result)) throw new Error(path + ': ' + JSON.stringify(j.errors || r.status));
  return j.result || [];
}

// "Workers CPU ms (first 30M are included)" -> 30e6. Units in "Millions of ..." are scaled to match.
function included(name, unit) {
  const m = /first ([\d.,]+)\s*(k|m|b|million|billion)?/i.exec(name);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ''));
  const mult = { k: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  n *= mult;
  if (/^millions/i.test(unit || '')) n /= 1e6;
  return n;
}

async function data(env) {
  const [usage, hist, subs] = await Promise.all([
    cf(env, '/billable-usage'),
    cf(env, '/billing/history?per_page=100'),
    cf(env, '/subscriptions').catch(() => []),
  ]);
  const by = {};
  for (const u of usage) {
    const k = u.ServiceName;
    const b = by[k] || (by[k] = { service: k, family: u.ServiceFamilyName, unit: u.ConsumedUnit || '', used: 0, cost: 0 });
    b.used += Number(u.ConsumedQuantity) || 0;
    b.cost += Number(u.BilledCost) || 0;
  }
  const meters = Object.values(by).map(b => {
    const inc = included(b.service, b.unit);
    return { ...b, included: inc, pct: inc ? b.used / inc : null };
  }).sort((a, b) => (b.cost - a.cost) || ((b.pct || 0) - (a.pct || 0)));
  const invoices = hist.filter(h => h.type === 'invoice').map(h => ({ date: h.occurred_at.slice(0, 10), amount: h.amount ?? null, receipt: h.receipt_id, status: h.status }));
  const plans = subs.filter(s => s.price > 0 || s.rate_plan?.scope !== 'zone').map(s => ({ name: s.rate_plan?.public_name, price: s.price, freq: s.frequency }));
  return { periodStart: usage[0]?.BillingPeriodStart?.slice(0, 10), meters, invoices, plans, at: new Date().toISOString() };
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n).toFixed(2);
const num = n => n >= 1e9 ? +(n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (+n.toFixed(2)).toString();

function page(d) {
  const overage = d.meters.reduce((s, m) => s + m.cost, 0);
  const base = d.plans.reduce((s, p) => s + (p.price || 0), 0);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const year = d.invoices.filter(i => i.date >= yearAgo && i.amount != null);
  const yearTotal = year.reduce((s, i) => s + i.amount, 0);
  const months = {};
  for (const i of year) months[i.date.slice(0, 7)] = (months[i.date.slice(0, 7)] || 0) + i.amount;
  const mKeys = Object.keys(months).sort();
  const mMax = Math.max(1, ...Object.values(months));
  const hot = d.meters.filter(m => m.cost > 0 || (m.pct || 0) >= 0.7);
  const flag = m => m.cost > 0 ? 'bad' : (m.pct || 0) >= 0.7 ? 'warn' : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cloudflare Spend</title><meta name="robots" content="noindex">
<style>
:root{--bg:#f4f3ef;--card:#fff;--fg:#1b1b18;--dim:#6b6a63;--line:#dedcd4;--accent:#f38020;--ok:#2e7d4f;--warn:#b07400;--bad:#c2341b;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--ok:#5cc489;--warn:#e3a93c;--bad:#ff6b52;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--ok:#5cc489;--warn:#e3a93c;--bad:#ff6b52;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,sans-serif}
.w{max-width:960px;margin:0 auto;padding:24px 16px 64px;display:grid;gap:24px}
h1{margin:0;font-size:1.8rem;letter-spacing:-.02em}h2{margin:0 0 8px;font-size:1rem}
.dim{color:var(--dim)}.mono{font-family:ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px}
.tile b{display:block;font-size:1.6rem;font-variant-numeric:tabular-nums}.tile span{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:7px 8px;border-top:1px solid var(--line);text-align:left;vertical-align:middle}th{border-top:0;font-size:12px;color:var(--dim);font-weight:600}
td.r,th.r{text-align:right}
.bar{height:6px;background:var(--line);border-radius:3px;min-width:80px;overflow:hidden}.bar i{display:block;height:100%;background:var(--ok)}
tr.warn .bar i{background:var(--warn)}tr.bad .bar i{background:var(--bad)}tr.bad td:first-child,tr.warn td:first-child{font-weight:600}
.months{display:flex;align-items:flex-end;gap:6px;height:120px}.months div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;min-width:0;height:100%}
.months i{display:block;width:100%;background:var(--accent);border-radius:3px 3px 0 0}.months small{font-size:10px;color:var(--dim)}
.ok{color:var(--ok)}.alert{border-left:3px solid var(--warn);padding:8px 12px;background:var(--card);border-radius:4px}
</style></head><body><div class="w">
<header><h1>Cloudflare spend</h1><p class="dim">Billing period since ${esc(d.periodStart)} · live as of ${esc(d.at.slice(0, 16).replace('T', ' '))} UTC</p></header>
<section class="tiles">
  <div class="tile"><b>${money(base)}</b><span>Plans / month</span></div>
  <div class="tile"><b class="${overage > 0 ? '' : 'ok'}">${money(overage)}</b><span>Usage overage this period</span></div>
  <div class="tile"><b>${money(yearTotal)}</b><span>Invoiced last 12 months</span></div>
  <div class="tile"><b>${hot.length}</b><span>Meters ≥70% or charging</span></div>
</section>
${hot.length ? `<div class="alert">Watch: ${hot.map(m => esc(m.service.replace(/\s*\(.*\)/, ''))).join(' · ')}</div>` : `<p class="ok">Every meter is inside what's included. Nothing is costing extra.</p>`}
<section class="card"><h2>Invoices by month</h2><div class="months">${mKeys.map(k => `<div title="${esc(k)}: ${money(months[k])}"><small class="mono">${Math.round(months[k])}</small><i style="height:${Math.max(2, months[k] / mMax * 90)}%"></i><small>${esc(k.slice(2))}</small></div>`).join('')}</div></section>
<section class="card"><h2>Plans</h2><table><tr><th>Plan</th><th class="r">Price</th><th>Billed</th></tr>${d.plans.map(p => `<tr><td>${esc(p.name)}</td><td class="r mono">${money(p.price || 0)}</td><td class="dim">${esc(p.freq)}</td></tr>`).join('')}</table></section>
<section class="card"><h2>Usage this period</h2><table><tr><th>Meter</th><th class="r">Used</th><th class="r">Included</th><th>Of included</th><th class="r">Cost</th></tr>
${d.meters.map(m => `<tr class="${flag(m)}"><td>${esc(m.service.replace(/\s*\(.*\)/, ''))}<br><small class="dim">${esc(m.family)}</small></td><td class="r mono">${num(m.used)} <small class="dim">${esc(m.unit)}</small></td><td class="r mono">${m.included != null ? num(m.included) : '—'}</td><td>${m.pct != null ? `<div class="bar"><i style="width:${Math.min(100, m.pct * 100).toFixed(1)}%"></i></div><small class="dim mono">${(m.pct * 100).toFixed(1)}%</small>` : ''}</td><td class="r mono">${money(m.cost)}</td></tr>`).join('')}
</table></section>
<section class="card"><h2>Invoices</h2><p class="dim" style="margin:0 0 8px">Large one-offs are usually domain registrations/renewals. Line items: dashboard → Billing → Invoices.</p><table><tr><th>Date</th><th>Receipt</th><th class="r">Amount</th></tr>
${d.invoices.map(i => `<tr${i.amount >= 25 ? ' class="warn"' : ''}><td class="mono">${esc(i.date)}</td><td class="mono dim">${esc(i.receipt)}</td><td class="r mono">${i.amount == null ? "<span class=dim>—</span>" : money(i.amount)}</td></tr>`).join('')}
</table></section>
<p class="dim"><a href="/api/data" style="color:var(--accent)">Raw JSON</a></p>
</div></body></html>`;
}

function authed(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ') || !env.DASH_PASSWORD) return false;
  let pass = '';
  try { pass = atob(h.slice(6)).split(':').slice(1).join(':'); } catch { return false; }
  const a = new TextEncoder().encode(pass), b = new TextEncoder().encode(env.DASH_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname === "/favicon.ico") return new Response(null, { status: 204 });
    if (!authed(req, env)) return new Response("Login required", { status: 401, headers: { "WWW-Authenticate": "Basic realm=\"cf-cost\"" } });
    const url = new URL(req.url);
    try {
      const d = await data(env);
      if (url.pathname === '/api/data') return Response.json(d);
      if (url.pathname !== '/') return new Response('Not found', { status: 404 });
      return new Response(page(d), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    } catch (e) {
      return new Response('Billing API error: ' + e.message, { status: 502 });
    }
  },
};
