import { esc, money, num, DOMAINS_HINT, R2_HINT, R2_NOTE, cents } from '../lib.js';

// Ledger: clean light/dark cards, the original look.
export default function ledger(s) {
  const { overage, base, yearTotal, months, mMax, hot, flag } = s, d = s;
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
.ok{color:var(--ok)}@media (max-width:560px){.hs{display:none}td,th{padding:6px 4px;font-size:13px}.card{padding:10px}}.alert{border-left:3px solid var(--warn);padding:8px 12px;background:var(--card);border-radius:4px}
</style></head><body><div class="w">
<header><h1>Cloudflare spend</h1><p class="dim">Billing period since ${esc(d.periodStart)} · live as of ${esc(d.at.slice(0, 16).replace('T', ' '))} UTC</p></header>
<section class="tiles">
  <div class="tile"><b>${money(base)}</b><span>Plans / month</span></div>
  <div class="tile"><b class="${overage > 0 ? '' : 'ok'}">${money(overage)}</b><span>Usage overage this period</span></div>
  <div class="tile"><b>${money(yearTotal)}</b><span>Invoiced last 12 months</span></div>
  <div class="tile"><b>${hot.length}</b><span>Meters ≥70% or charging</span></div>
  ${s.domains ? `<div class="tile"><b>${money(s.renew12)}</b><span>Domain renewals, next 12 mo</span></div>` : ""}
</section>
${hot.length ? `<div class="alert">Watch: ${hot.map(m => esc(m.service.replace(/\s*\(.*\)/, ''))).join(' · ')}</div>` : `<p class="ok">Every meter is inside what's included. Nothing is costing extra.</p>`}
<section class="card"><h2>Invoices by month</h2><div class="months">${months.map(({ month: k, amount: v }) => `<div title="${esc(k)}: ${money(v)}"><small class="mono">${Math.round(v)}</small><i style="height:${Math.max(2, v / mMax * 90)}%"></i><small>${esc(k.slice(2))}</small></div>`).join('')}</div></section>
<section class="card"><h2>Plans</h2><table><tr><th>Plan</th><th class="r">Price</th><th>Billed</th></tr>${d.plans.map(p => `<tr><td>${esc(p.name)}</td><td class="r mono">${money(p.price || 0)}</td><td class="dim">${esc(p.freq)}</td></tr>`).join('')}</table></section>
<section class="card"><h2>Usage this period</h2><table><tr><th>Meter</th><th class="r">Used</th><th class="r">Included</th><th>Of included</th><th class="r">Cost</th></tr>
${d.meters.map(m => `<tr class="${flag(m)}"><td>${esc(m.service.replace(/\s*\(.*\)/, ''))}<br><small class="dim">${esc(m.family)}</small></td><td class="r mono">${num(m.used)} <small class="dim">${esc(m.unit)}</small></td><td class="r mono">${m.included != null ? num(m.included) : '—'}</td><td>${m.pct != null ? `<div class="bar"><i style="width:${Math.min(100, m.pct * 100).toFixed(1)}%"></i></div><small class="dim mono">${(m.pct * 100).toFixed(1)}%</small>` : ''}</td><td class="r mono">${money(m.cost)}</td></tr>`).join('')}
</table></section>
${!s.buckets ? `<section class="card"><h2>R2 by bucket</h2><p class="dim" style="margin:0">${esc(R2_HINT)}</p></section>` : s.buckets.length ? `<section class="card"><h2>R2 by bucket · ${num(s.r2A)} Class A · ${num(s.r2B)} Class B this period</h2><p class="dim" style="margin:0 0 8px">${esc(R2_NOTE)}</p><table><tr><th>Bucket</th><th class="r">Class A</th><th class="r">Class B</th><th class="hs">Top action</th><th class="r">List $</th></tr>${s.buckets.map(b => `<tr${b.classA >= 1e6 ? ' class="bad"' : b.classA >= 1e5 ? ' class="warn"' : ''}><td>${esc(b.bucket)}</td><td class="r mono">${num(b.classA)}</td><td class="r mono">${num(b.classB)}</td><td class="hs dim">${esc(b.top)} <span class="mono">${num(b.topN)}</span></td><td class="r mono">${cents(b.cost)}</td></tr>`).join('')}</table></section>` : ''}
${!s.domains ? `<section class="card"><h2>Domains</h2><p class="dim" style="margin:0">${esc(DOMAINS_HINT)}</p></section>` : `<section class="card"><h2>Domains · ${money(s.renew12)} renewing in the next 12 months</h2><p class="dim" style="margin:0 0 8px">${s.domains.length} domains · ${money(s.renewYear)}/yr if all auto-renew ${s.soon.length ? `· <b style="color:var(--warn)">${s.soon.length} renew within 60 days</b>` : ""}</p><table><tr><th>Domain</th><th class="hs">Renews</th><th class="r">In</th><th>Auto</th><th class="r">Price/yr</th></tr>${s.domains.map(x => `<tr${x.days <= 60 ? ' class="warn"' : ""}><td>${esc(x.name)}</td><td class="mono hs">${esc(x.expires)}</td><td class="r mono">${x.days}d</td><td>${x.autoRenew ? "on" : '<span style="color:var(--bad)">off</span>'}</td><td class="r mono">${x.renewal == null ? "—" : money(x.renewal)}</td></tr>`).join("")}</table></section>`}
<section class="card"><h2>Invoices</h2><p class="dim" style="margin:0 0 8px">Large one-offs are usually domain registrations/renewals. Line items: dashboard → Billing → Invoices.</p><table><tr><th>Date</th><th>Receipt</th><th class="r">Amount</th></tr>
${d.invoices.map(i => `<tr${i.amount >= 25 ? ' class="warn"' : ''}><td class="mono">${esc(i.date)}</td><td class="mono dim">${esc(i.receipt)}</td><td class="r mono">${i.amount == null ? "<span class=dim>—</span>" : money(i.amount)}</td></tr>`).join('')}
</table></section>
<p class="dim">Look: <a href="?t=ledger" style="color:var(--accent)">ledger</a> · <a href="?t=terminal" style="color:var(--accent)">terminal</a> · <a href="?t=receipt" style="color:var(--accent)">receipt</a> · <a href="/api/data" style="color:var(--accent)">JSON</a></p>
</div></body></html>`;
}
