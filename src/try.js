import { LOGO, ICON_LINK, CREDIT } from './brand.js';
import { DIAGRAM_CSS } from './templates/exploded.js';
import { PRINTER_CSS } from './printer.js';

// Public /try page: visitor pastes a read-only token, it stays in this tab (sessionStorage), the worker uses it
// for one render and forgets it. Nothing stored server-side.
export const TOKEN_URL = 'https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all';

// intro = { svg, total, count } from diagram(): landing-page stage (tap the cloud → Brian's real bill explodes → "See what you pay").
export default function tryPage(intro) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CF Cost · what does Cloudflare cost me?</title>${ICON_LINK}<meta name="description" content="See what Cloudflare actually costs you, in 10 seconds. Read-only token, nothing stored.">
<meta name="twitter:card" content="summary_large_image"><meta property="og:type" content="website"><meta property="og:url" content="https://cfcost.com/"><meta property="og:title" content="CF Cost · what does Cloudflare cost me?"><meta property="og:description" content="See what Cloudflare actually costs you, in 10 seconds. Read-only token, nothing stored."><meta property="og:image" content="https://cfcost.com/card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
${intro ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=DM+Mono:wght@400;500&display=swap">' : ''}
<style>
:root{--bg:#f4f3ef;--card:#fff;--fg:#1b1b18;--dim:#6b6a63;--line:#dedcd4;--accent:#f38020;--bad:#c2341b;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--bad:#ff6b52;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--bad:#ff6b52;color-scheme:dark}
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,sans-serif}
.w{max-width:640px;margin:0 auto;padding:40px 16px 64px;display:grid;gap:20px}
h1{margin:0;font-size:2rem;letter-spacing:-.02em;line-height:1.15}p{margin:0}.dim{color:var(--dim)}
ol{margin:0;padding:0;list-style:none;display:grid;gap:12px}
li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px;display:grid;gap:10px}
li b{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}
a.btn.alt{background:transparent;color:var(--accent);border:2px solid var(--accent);padding:8px 14px}
a.btn,button{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:6px;padding:10px 16px;font:600 15px system-ui;text-decoration:none;cursor:pointer;justify-self:start}
button:disabled{opacity:.6;cursor:wait}
input{width:100%;padding:10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font:14px ui-monospace,Menlo,monospace}
.brand{display:flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none;font:700 18px system-ui;letter-spacing:-.01em}
#err{color:var(--bad)}small{font-size:13px}
${intro ? `${DIAGRAM_CSS}
${PRINTER_CSS}
.stage{max-width:1040px;margin:0 auto;padding:24px 16px 8px;display:grid;gap:14px;--ink:var(--fg);--cloud:#f38020;justify-items:center;text-align:center}
.stage .brand{justify-self:start}
.stage h1{font:400 min(52px,5.6vw)/1.1 "Bowlby One",Impact,sans-serif;letter-spacing:0;white-space:nowrap}
.stage .fig{width:100%;overflow:visible}.stage .fig svg{min-width:0}
.idle .bit,.idle .tag,.idle .sum{visibility:hidden;animation:none}
.idle svg{min-width:0;max-height:55vh;margin:0 auto;cursor:pointer}
.idle .cl{opacity:1;animation:breathe 2.6s ease-in-out infinite}
@keyframes breathe{50%{transform:scale(1.03)}}
.fig:not(.idle) .cta{display:none}
.idle svg:focus-visible{outline:3px solid var(--accent);outline-offset:6px;border-radius:12px}
.after{display:grid;gap:14px;justify-items:center;max-width:560px;font:15px/1.5 "DM Mono",ui-monospace,monospace}
.after p{color:var(--dim)}.after a{color:var(--accent)}
.after .go{font:400 22px "Bowlby One",Impact,sans-serif;padding:14px 26px;border-radius:999px;justify-self:center;letter-spacing:.01em}
.after .go:focus-visible{outline:3px solid var(--fg);outline-offset:3px}
@media (prefers-reduced-motion:reduce){.idle .cl{animation:none}}` : ''}
</style></head><body>${intro ? `<section class="stage" id="stage">
<a href="/" class="brand">${LOGO}<span>CF Cost</span></a>
<h1>What does Cloudflare cost me?</h1>
<div class="fig" id="sfig">${intro.svg}</div>
<script>(()=>{const f=document.getElementById('sfig'),v=f.querySelector('svg'),cy=+v.dataset.cy;f.classList.add('idle');v.setAttribute('viewBox','290 '+(cy-137)+' 420 230');v.setAttribute('tabindex','0');v.setAttribute('aria-label','Tap the cloud to see a real Cloudflare bill')})()</script>
<div class="after" id="after">
${intro.printer ? intro.printer.html : ''}
<p>These are real costs from <a href="https://x.com/intent/follow?screen_name=brianball" target="_blank" rel="noopener">@brianball</a>'s Cloudflare account this month: ${intro.count} charges, ${'$' + intro.total.toFixed(2)} a month. Names are hidden.</p>
<button class="go" id="yoursBtn" type="button">See what you pay →</button>
<p><small><a href="/brian">Explore Brian's bill</a> · <a href="/try/demo">Sample account</a></small></p>
</div></section>` : ''}<main class="w">
${intro ? '' : `<a href="/" class="brand">${LOGO}<span>CF Cost</span></a>`}
<h1>${intro ? 'Now see what you pay' : 'What does Cloudflare cost me?'}</h1>
<p class="dim">Plans, usage vs. what's included, invoices, domain renewals, all on one page. Takes about 10 seconds.</p>
<ol>
<li><b>1 · Make a read-only token</b><p>This link opens Cloudflare with the read permissions already ticked. Scroll down, click <em>Continue to summary</em>, then <em>Create Token</em>.</p>
<a class="btn" href="${TOKEN_URL}" target="_blank" rel="noopener">Create token on Cloudflare ↗</a></li>
<li><b>2 · Paste it</b><form id="f" style="display:grid;gap:10px">
<input id="tok" type="password" autocomplete="off" spellcheck="false" placeholder="Paste token" required>
<input type="hidden" name="t" value="exploded">
<button id="go">Show my bill</button><p id="err" role="alert"></p></form></li>
</ol>
<section style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px;display:grid;gap:10px">
<b style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)">Or run your own copy</b>
<p>Deploy CF Cost to your Cloudflare account. Your token never leaves your account, and the dashboard is behind your own password at <code>/me</code>.</p>
<a class="btn alt" href="https://deploy.workers.cloudflare.com/?url=https://github.com/ideabrian/cf-cost" target="_blank" rel="noopener">Deploy to Cloudflare ↗</a></section>
<p class="dim"><small>The token stays in this browser tab. Our worker uses it to call Cloudflare's API for each page load, then discards it: no database, no logs. Close the tab and it's gone. <a href="https://github.com/ideabrian/cf-cost" style="color:var(--accent)">Open source</a>.<br>CF Cost is an independent tool, not affiliated with Cloudflare.</small></p>
<p class="dim" style="text-align:center"><small>${CREDIT}</small></p>
</main>
<script>
${intro ? `(()=>{const f=document.getElementById('sfig'),v=f.querySelector('svg'),H=+v.dataset.h,cy=+v.dataset.cy,a=document.getElementById('after'),m=document.querySelector('main.w');
a.hidden=true;m.hidden=true;let done=false;
function boom(){if(done)return;done=true;v.removeAttribute('tabindex');v.setAttribute('aria-label',v.getAttribute('aria-label').replace('Tap the cloud to see','Exploded diagram of'));
const from=[290,cy-137,420,230],to=[0,0,1000,H],t0=performance.now(),D=matchMedia('(prefers-reduced-motion:reduce)').matches?1:800;
f.classList.remove('idle');(function step(t){const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);v.setAttribute('viewBox',from.map((x,i)=>x+(to[i]-x)*e).join(' '));if(k<1)requestAnimationFrame(step)})(t0);
setTimeout(()=>{a.hidden=false;a.scrollIntoView({behavior:'smooth',block:'nearest'})},1600)}
v.addEventListener('click',boom);v.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();boom()}});
${intro.printer ? intro.printer.js : ''}
document.getElementById('yoursBtn').onclick=()=>{m.hidden=false;m.scrollIntoView({behavior:'smooth'});setTimeout(()=>document.getElementById('tok').focus({preventScroll:true}),400)};})();` : ''}
const K='cfcost_token',f=document.getElementById('f'),err=document.getElementById('err'),go=document.getElementById('go');
const t0=new URLSearchParams(location.search).get('t');
if(t0&&/^(exploded|ledger|terminal|receipt)$/.test(t0))f.t.value=t0;
async function show(tok,t){
  go.disabled=true;go.textContent='Reading your bill…';err.textContent='';
  try{
    const r=await fetch('/try/render?t='+encodeURIComponent(t),{method:'POST',headers:{'X-CF-Token':tok}});
    const h=await r.text();
    if(!r.ok)throw new Error(h);
    try{sessionStorage.setItem(K,tok)}catch{}
    history.replaceState(null,'','/try?t='+t);
    document.open();document.write(h);document.close();
  }catch(e){
    try{sessionStorage.removeItem(K)}catch{}
    err.textContent=e.message||'Something went wrong';go.disabled=false;go.textContent='Show my bill';
  }
}
f.onsubmit=e=>{e.preventDefault();show(document.getElementById('tok').value.trim(),f.t.value)};
let saved=null;try{saved=sessionStorage.getItem(K)}catch{}
if(saved)show(saved,f.t.value);
</script><script src="/chat.js" defer></script></body></html>`;
}
