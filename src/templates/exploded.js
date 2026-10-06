import { esc, money, num, short } from '../lib.js';
import { TOKEN_URL } from '../try.js';
import { printer, PRINTER_CSS } from '../printer.js';

// Exploded: your bill as an exploded-view diagram. Every charge bursts out of the orange cloud, labeled.
// Layout can't collide: labels live only in two fixed gutters (x<250, x>750), one per 100px row, clipped to fit;
// icons live only in the middle band; leader lines stop at the icon edge nearest the label; cloud is drawn first.

const ICONS = {
  coin: c => `<circle r="30" fill="${c}"/><text y="11" text-anchor="middle" font-family="Bowlby One,Impact" font-size="30" fill="#fff">$</text>`,
  bars: c => `<g fill="${c}"><rect x="-26" y="-4" width="12" height="24"/><rect x="-8" y="-16" width="12" height="36"/><rect x="10" y="-28" width="12" height="48"/></g>`,
  clock: c => `<circle r="22" fill="var(--bg)" stroke="${c}" stroke-width="5"/><path d="M0 0V-13M0 0L9 6" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
  db: c => `<g fill="${c}"><ellipse cy="-14" rx="20" ry="7"/><rect x="-20" y="-14" width="40" height="28"/><ellipse cy="14" rx="20" ry="7"/></g><path d="M-20 -2a20 7 0 0 0 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`,
  bucket: c => `<path d="M-22 -16h44l-7 36h-30z" fill="${c}"/><ellipse cy="-16" rx="22" ry="6" fill="${c}" stroke="#fff" stroke-width="1.5"/>`,
  key: c => `<g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><circle cx="-14" r="11"/><path d="M-3 0h30M18 0v9M26 0v7"/></g>`,
  chip: c => `<rect x="-20" y="-20" width="40" height="40" rx="6" fill="${c}"/><text y="6" text-anchor="middle" font-family="DM Mono,monospace" font-size="14" font-weight="500" fill="#fff">AI</text><path d="M-10 -27v7M0 -27v7M10 -27v7M-10 20v7M0 20v7M10 20v7" stroke="${c}" stroke-width="3"/>`,
  box: c => `<path d="M0 -22l22 11v22l-22 11-22-11v-22z" fill="${c}"/><path d="M-22 -11l22 11 22-11M0 0v22" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/>`,
  check: c => `<circle r="24" fill="${c}"/><path d="M-11 0l7 8 14-16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  globe: c => `<circle r="22" fill="none" stroke="${c}" stroke-width="5"/><path d="M-22 0h44M0 -22c-12 12-12 32 0 44M0 -22c12 12 12 32 0 44" stroke="${c}" stroke-width="3" fill="none"/>`,
};
function pick(name) {
  const n = name.toLowerCase();
  if (/cpu/.test(n)) return ['clock', '#9b6bd6'];
  if (/d1/.test(n)) return ['db', /writ/.test(n) ? '#d8402b' : '#2f9e6e'];
  if (/r2/.test(n)) return ['bucket', /class a/.test(n) ? '#a8261a' : '#e9b04a'];
  if (/kv/.test(n)) return ['key', '#6b8e23'];
  if (/durable/.test(n)) return ['box', '#2a7ab0'];
  if (/request/.test(n)) return ['bars', '#4a8fe7'];
  if (/domain|registrar/.test(n)) return ['globe', '#3a8f8f'];
  if (/\bai\b|neuron/.test(n)) return ['chip', '#c2341b'];
  return ['coin', '#f38020'];
}
const PROMPT = `Help me make a read-only Cloudflare API token for cfcost.com. Open this pre-filled link (it only ticks Read permissions): ${TOKEN_URL} . Scroll down, click Continue to summary, then Create Token. Don't add any Edit permissions. Then paste the token into https://cfcost.com and click Show my bill. Never post the token anywhere else.`;
const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

// The diagram alone (used by this template and the landing page). Needs DIAGRAM_CSS + tokens --ink --dim --line --cloud --bad.
export function diagram(s, { cta = '' } = {}) {
  // Paid meters always show. Free ones: the 4 closest to their limit show, the rest fold into one "+N more" item.
  const meter = m => ({ name: short(m.service), cost: m.cost, pct: m.pct || 0, note: m.cost > 0 || m.included == null ? `${money(m.cost)} · ${num(m.used || 0)} ${m.unit}` : `$0 · ${num(m.used || 0)} of ${num(m.included)} free (${((m.pct || 0) * 100).toFixed(0)}%)` });
  const paid = s.meters.filter(m => m.cost > 0).map(meter);
  const free = s.meters.filter(m => !(m.cost > 0)).map(meter).sort((a, b) => b.pct - a.pct);
  const SHOW_FREE = 4, rest = free.slice(SHOW_FREE);
  const items = [
    ...s.plans.filter(p => p.price > 0).map(p => ({ name: p.name, cost: p.price, note: `${money(p.price)} / mo plan` })),
    ...paid, ...free.slice(0, SHOW_FREE),
  ];
  if (rest.length > 1) items.push({ name: `+${rest.length} more, all free`, cost: 0, note: `each under ${Math.ceil(rest[0].pct * 100) || 1}% of its free tier`, icon: ['check', '#3a9a5b'] });
  else items.push(...rest);
  if (s.domains?.length) items.push({ name: 'Domain renewals', cost: s.renew12 / 12, note: `${money(s.renew12)} next 12 mo` });
  const max = Math.max(1, ...items.map(i => i.cost));
  const rows = Math.ceil(items.length / 2), top = 90, H = top + rows * 100 + 170;
  const cy = H - 70; // cloud center (cloud drawn at 62% so the total, not the cloud, carries the weight)
  const parts = items.map((it, i) => {
    const side = i % 2 ? 'R' : 'L', row = Math.floor(i / 2), ly = top + row * 100;
    const lx = side === 'L' ? 24 : 760;
    const ix = side === 'L' ? (row % 2 ? 340 : 410) : (row % 2 ? 660 : 590), iy = ly - 10 + (row % 2) * 12;
    const sc = it.cost > 0 ? (0.95 + 0.5 * it.cost / max).toFixed(2) : 0.8;
    const edge = 38 * sc, sx = side === 'L' ? ix - edge : ix + edge;
    const name = clip(it.name, 25), note = clip(it.note, 34);
    const ex = side === 'L' ? lx + Math.max(name.length * 9, note.length * 7.3) + 8 : lx - 8;
    const [k, c] = it.icon || pick(it.name);
    return `<g class="bit${it.cost > 0 ? '' : ' free'}" style="--i:${i};--dx:${500 - ix}px;--dy:${cy - iy}px"><g transform="translate(${ix} ${iy}) scale(${sc})">${ICONS[k](c)}</g></g>
<g class="tag${it.cost > 0 ? ' paid' : ''}" style="--i:${i}"><path class="lead" d="M${ex.toFixed(0)} ${ly - 5} L${sx.toFixed(0)} ${iy}"/><circle class="dot" cx="${sx.toFixed(0)}" cy="${iy}" r="3"/><text class="lbl" x="${lx}" y="${ly}">${esc(name)}</text><text class="note" x="${lx}" y="${ly + 16}">${esc(note)}</text></g>`;
  }).join('\n');
  const total = s.base + s.overage;
  const count = items.length + (rest.length > 1 ? rest.length - 1 : 0);
  const svg = `<svg viewBox="0 0 1000 ${H}" data-h="${H}" data-cy="${cy}" role="img" aria-label="Exploded diagram of this Cloudflare bill: ${count} charges, ${money(total)} a month">
<g class="cl" opacity=".22"><path transform="translate(500 ${cy}) scale(.62) translate(-494 -600)" d="M720 690H300a80 80 0 0 1-9-159.5A118 118 0 0 1 497 482a96 96 0 0 1 158 61A76 76 0 0 1 720 690z" fill="var(--cloud)"/></g>
<g class="sum"><text x="500" y="${cy + 16}" text-anchor="middle" font-family="Bowlby One,Impact" font-size="44" fill="var(--ink)">${money(total)}<tspan font-size="20" fill="var(--dim)"> / mo</tspan></text></g>
${cta ? `<text class="cta" x="500" y="${cy + 10}" text-anchor="middle" font-family="Bowlby One,Impact" font-size="27" fill="#fff">${esc(cta)}</text>` : ''}
${parts}
</svg>`;
  return { svg, count, total };
}

export const DIAGRAM_CSS = `.fig{overflow-x:auto}.fig svg{display:block;width:100%;min-width:640px;height:auto}
.lbl{font:500 15px "DM Mono",monospace;fill:var(--ink)}.note{font:12px "DM Mono",monospace;fill:var(--dim)}
.paid .note{fill:var(--bad)}
.lead{stroke:var(--line);stroke-width:1.3;fill:none;stroke-dasharray:3 4}.dot{fill:var(--ink)}
.free{opacity:.45}
.bit{animation:pop 1.1s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i)*70ms)}
.tag{animation:fade .5s ease both;animation-delay:calc(.7s + var(--i)*70ms)}
@keyframes pop{from{transform:translate(var(--dx),var(--dy)) scale(.2) rotate(40deg)}}
@keyframes fade{from{opacity:0}}
.cl{animation:kick .5s ease-out both;transform-box:fill-box;transform-origin:50% 100%}
@keyframes kick{0%{transform:scale(1.08,.9)}60%{transform:scale(.97,1.04)}}
@media (prefers-reduced-motion:reduce){.bit,.tag,.cl{animation:none}}`;

export default function exploded(s) {
  const { svg, count } = diagram(s);
  const pr = printer(s, { who: s.serverToken ? '@brianball' : '', safe: `<div class="safe" id="safe" hidden><h2>Why this is safe</h2><dl>
<dt>Read-only token</dt><dd>It can view billing and usage. It can't change, deploy or delete anything in your account.</dd>
${s.serverToken ? `<dt>Token kept secret</dt><dd>This page uses Brian's read-only token, stored server-side as an encrypted Cloudflare secret. Visitors never see it, and the page is cached so it's rarely used. Yours would work differently: it stays in your browser tab and is never stored. <a href="https://github.com/ideabrian/cf-cost">Read the code</a>.</dd>` : `<dt>Nothing stored</dt><dd>The token stays in this browser tab. Our worker uses it for one page load and forgets it: no database, no logs. <a href="https://github.com/ideabrian/cf-cost">Read the code</a>.</dd>`}
<dt>Share the picture, not the token</dt><dd>Post this diagram anywhere; what you spend on Cloudflare is nobody's secret. Keep the token itself private, since anyone holding it can read your invoices and domain list.</dd>
<dt>Let your AI make the token</dt><dd>Paste this into Claude (or any agent that can use your browser).</dd></dl>
<button type="button" id="copyPrompt">Copy prompt</button></div>` });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cloudflare Spend</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=DM+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#fbf6ec;--ink:#2a1d14;--dim:#8a7564;--line:#c9b49c;--cloud:#f38020;--bad:#c2341b;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1d1611;--ink:#f6eadb;--dim:#b29c86;--line:#5a4636;--bad:#ff6b52;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1d1611;--ink:#f6eadb;--dim:#b29c86;--line:#5a4636;--bad:#ff6b52;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "DM Mono",ui-monospace,monospace}
.w{max-width:1040px;margin:0 auto;padding:32px 16px 48px;display:grid;gap:12px}
h1{font:400 clamp(32px,6vw,60px)/1 "Bowlby One",Impact,sans-serif;margin:0}
${DIAGRAM_CSS}
.sub{color:var(--dim);margin:0}
nav a,button{color:var(--ink)}
button{justify-self:start;font:500 14px "DM Mono",monospace;background:none;border:1.5px solid var(--ink);border-radius:999px;padding:8px 16px;cursor:pointer}
${PRINTER_CSS}
.safe[hidden]{display:none}.safe{justify-self:center;width:min(560px,100%);background:#111;color:#e9e6df;border-radius:16px;padding:18px 20px;display:grid;gap:12px;font-size:13px}
.safe h2{margin:0;font:400 20px "Bowlby One",Impact,sans-serif;color:#3ddc84}
.safe dl{margin:0;display:grid;gap:10px}.safe dt{font-weight:500;color:#fff}.safe dd{margin:2px 0 0;color:#b9b5ab}
.safe a{color:#3ddc84}.safe button{justify-self:start;font:500 13px "DM Mono",monospace;background:#3ddc84;color:#111;border:0;border-radius:999px;padding:8px 14px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.led{animation:none}}
</style></head><body><div class="w">
<h1>Your bill, exploded</h1>
<p class="sub">Period from ${esc(s.periodStart)}. ${count} charges. Red notes cost money; faded ones are still inside the free tier.</p>
<button id="again" type="button">Detonate again</button>
<div class="fig" id="fig">${svg}</div>
${pr.html}
<nav class="sub"><a href="?t=ledger">ledger</a> · <a href="?t=terminal">terminal</a> · <a href="?t=receipt">receipt</a> · <a href="?t=exploded">exploded</a></nav>
</div>
<script>document.getElementById('again').onclick=()=>{const f=document.getElementById('fig'),h=f.innerHTML;f.innerHTML='';void f.offsetWidth;f.innerHTML=h}
${pr.js}
const P=${JSON.stringify(PROMPT)};document.getElementById('copyPrompt').onclick=async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText(P);b.textContent='Copied'}catch{b.textContent='Copy failed: select the text below';const t=document.createElement('textarea');t.value=P;t.rows=5;t.style.cssText='width:100%;font:12px monospace';b.after(t);t.select()}}</script>
</body></html>`;
}
