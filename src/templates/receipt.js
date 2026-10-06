import { esc, money, num, short } from '../lib.js';

// Receipt: a till receipt on a desk. Your Cloudflare bill as one long printout.
export default function receipt(s) {
  const row = (l, r, cls = '') => `<div class="row ${cls}"><span>${l}</span><i></i><span>${r}</span></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cloudflare Spend</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&family=Courier+Prime:wght@400;700&display=swap">
<style>
:root{--desk:#c9b79c;--paper:#fdfbf5;--ink:#2b2a27;--dim:#8b877c;--red:#b3261e;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--desk:#2a241d;--paper:#ecE7da;--ink:#1f1e1b;--dim:#7a7568}}
:root[data-theme="dark"]{--desk:#2a241d;--paper:#ece7da;--ink:#1f1e1b;--dim:#7a7568}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--desk) radial-gradient(circle at 30% 20%,rgba(255,255,255,.15),transparent 60%);color:var(--ink);font:14px/1.5 'Courier Prime',ui-monospace,monospace;padding:32px 16px 64px}
.slip{max-width:380px;margin:0 auto;background:var(--paper);padding:28px 22px 36px;box-shadow:0 18px 40px rgba(0,0,0,.25);transform:rotate(-.6deg);position:relative;
  -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/14px 100%;mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/14px 100%}
.c{text-align:center}.logo{font:44px/1 VT323,monospace;letter-spacing:.06em}
.dim{color:var(--dim)}.hr{border-top:2px dashed var(--ink);margin:14px 0;opacity:.6}
.row{display:flex;gap:6px;align-items:baseline}.row i{flex:1;border-bottom:1px dotted var(--dim);transform:translateY(-4px)}
.row span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row.warn{color:var(--red);font-weight:700}
.tot{font:700 22px 'Courier Prime',monospace}
.m small{display:block;color:var(--dim);font-size:11px;margin:-2px 0 6px}
.stamp{display:inline-block;border:3px solid var(--red);color:var(--red);font:700 18px 'Courier Prime';padding:2px 10px;transform:rotate(-8deg);opacity:.85;letter-spacing:.1em}
.bc{height:44px;margin-top:10px;background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 4px,var(--ink) 4px 5px,transparent 5px 8px,var(--ink) 8px 11px,transparent 11px 12px)}
a{color:var(--ink)}
</style></head><body><div class="slip">
<div class="c"><div class="logo">CLOUDFLARE</div><div class="dim">*** SPEND RECEIPT ***</div><div class="dim">PERIOD FROM ${esc(s.periodStart)}</div><div class="dim">PRINTED ${esc(s.at.slice(0, 16).replace('T', ' '))} UTC</div></div>
<div class="hr"></div>
${s.plans.map(p => row(esc(p.name.toUpperCase()), money(p.price || 0))).join('')}
<div class="hr"></div>
<div class="m">${s.meters.map(m => row(esc(short(m.service)), money(m.cost), s.flag(m)) + `<small>${esc(num(m.used))} ${esc(m.unit)}${m.included != null ? ` / ${esc(num(m.included))} incl · ${(m.pct * 100).toFixed(1)}%` : ''}</small>`).join('')}</div>
<div class="hr"></div>
${row('USAGE OVERAGE', money(s.overage))}
<div class="row tot"><span>DUE / MO</span><i></i><span>${money(s.base + s.overage)}</span></div>
<div class="c" style="margin:16px 0">${s.hot.length ? `<span class="stamp">WATCH ${s.hot.length}</span>` : '<span class="stamp">ALL CLEAR</span>'}</div>
<div class="hr"></div>
<div class="c dim">PAST 12 MONTHS: ${money(s.yearTotal)}</div>
${s.invoices.slice(0, 18).map(i => row(esc(i.date) + ' ' + esc(i.receipt), i.amount == null ? '—' : money(i.amount), i.amount >= 25 ? 'warn' : '')).join('')}
<div class="hr"></div>
<div class="c">THANK YOU FOR SHIPPING</div>
<div class="bc"></div>
<div class="c dim" style="margin-top:12px"><a href="?t=ledger">ledger</a> · <a href="?t=terminal">terminal</a> · <a href="?t=receipt">receipt</a></div>
</div></body></html>`;
}
