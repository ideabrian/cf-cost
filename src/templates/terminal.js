import { esc, money, num, short, DOMAINS_HINT } from '../lib.js';

// Terminal: phosphor-green monospace, ASCII meters. Always dark.
const bar = (p, w = 20) => { const f = Math.round(Math.min(1, p) * w); return '█'.repeat(f) + '░'.repeat(w - f); };

export default function terminal(s) {
  const pad = (t, n) => String(t).padEnd(n).slice(0, n);
  const meters = s.meters.map(m => {
    const c = s.flag(m) === 'bad' ? 'r' : s.flag(m) === 'warn' ? 'y' : '';
    const p = m.pct != null ? `<span class="${c || 'g'}">${bar(m.pct)}</span> ${(m.pct * 100).toFixed(1).padStart(5)}%` : `<span class="d">${'·'.repeat(20)}</span>      — `;
    return `<div class="ln ${c}">${esc(pad(short(m.service), 36))} ${p}  ${esc(num(m.used).padStart(9))}  ${money(m.cost).padStart(8)}</div>`;
  }).join('');
  const spark = s.months.map(m => '▁▂▃▄▅▆▇█'[Math.min(7, Math.floor(m.amount / s.mMax * 7.99))]).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cloudflare Spend</title><meta name="robots" content="noindex">
<style>
:root{--bg:#0a0f0a;--fg:#b6f5b0;--g:#39ff6a;--d:#3f6b45;--y:#ffd23f;--r:#ff5a4a;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.55 ui-monospace,'SF Mono',Menlo,monospace}
body::after{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}
.w{max-width:900px;margin:0 auto;padding:24px 16px 64px}
.scroll{overflow-x:auto}.ln{white-space:pre}
.g{color:var(--g)}.d{color:var(--d)}.y{color:var(--y)}.r{color:var(--r)}
h1{font:inherit;color:var(--g);margin:0 0 4px;text-shadow:0 0 8px rgba(57,255,106,.5)}
.big{font-size:22px;color:var(--g);text-shadow:0 0 10px rgba(57,255,106,.4)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:4px 24px;margin:16px 0}
.sec{margin-top:22px}.sec>.h{color:var(--d)}
a{color:var(--g)}.cur::after{content:"█";animation:b 1s steps(1) infinite}@keyframes b{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.cur::after{animation:none}}
</style></head><body><div class="w">
<h1>$ cf spend --live</h1>
<div class="d">period ${esc(s.periodStart)} · fetched ${esc(s.at.slice(0, 16).replace('T', ' '))}Z</div>
<div class="stats">
<div><div class="d">plans/mo</div><div class="big">${money(s.base)}</div></div>
<div><div class="d">overage</div><div class="big ${s.overage > 0 ? 'r' : ''}">${money(s.overage)}</div></div>
<div><div class="d">12mo invoiced</div><div class="big">${money(s.yearTotal)}</div></div>
<div><div class="d">trend</div><div class="big">${spark}</div></div>
</div>
<div class="${s.hot.length ? 'y' : 'g'}">${s.hot.length ? '[WARN] ' + s.hot.map(m => esc(short(m.service))).join(', ') : '[ OK ] all meters within included'}</div>
<div class="sec scroll"><div class="h">── plans ${'─'.repeat(40)}</div>
${s.plans.map(p => `<div class="ln">${esc(pad(p.name, 36))} ${money(p.price || 0).padStart(8)}  ${esc(p.freq)}</div>`).join('')}</div>
<div class="sec scroll"><div class="h">── meters ${'─'.repeat(39)}</div>${meters}</div>
${!s.domains ? `<div class="sec d">── domains: ${esc(DOMAINS_HINT)}</div>` : `<div class="sec scroll"><div class="h">── domains · ${money(s.renew12)} next 12mo · ${money(s.renewYear)}/yr ${'─'.repeat(12)}</div>
${s.domains.map(x => `<div class="ln ${x.days <= 60 ? 'y' : ''}">${esc(pad(x.name, 26))} ${esc(x.expires)}  ${String(x.days).padStart(4)}d  ${x.autoRenew ? 'auto  ' : '<span class="r">MANUAL</span>'}  ${x.renewal == null ? '       —' : money(x.renewal).padStart(8)}</div>`).join('')}</div>`}
<div class="sec scroll"><div class="h">── invoices ${'─'.repeat(37)}</div>
${s.invoices.map(i => `<div class="ln ${i.amount >= 25 ? 'y' : ''}">${esc(i.date)}  ${esc(pad(i.receipt, 12))}  ${i.amount == null ? '       —' : money(i.amount).padStart(8)}</div>`).join('')}</div>
<p class="sec">$ <span class="cur"></span></p>
<p class="d">themes: <a href="?t=ledger">ledger</a> · <a href="?t=terminal">terminal</a> · <a href="?t=receipt">receipt</a> · <a href="/api/data">json</a></p>
</div></body></html>`;
}
