import { LOGO, ICON_LINK, CREDIT } from './brand.js';

// Public /try page: visitor pastes a read-only token, it stays in this tab (sessionStorage), the worker uses it
// for one render and forgets it. Nothing stored server-side.
export const TOKEN_URL = 'https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all';

export default function tryPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CF Cost · what Cloudflare charges you</title>${ICON_LINK}<meta name="description" content="See what Cloudflare actually charges you, in 10 seconds. Read-only token, nothing stored.">
<meta name="twitter:card" content="summary_large_image"><meta property="og:type" content="website"><meta property="og:url" content="https://cfcost.com/"><meta property="og:title" content="CF Cost · what Cloudflare charges you"><meta property="og:description" content="See what Cloudflare actually charges you, in 10 seconds. Read-only token, nothing stored."><meta property="og:image" content="https://cfcost.com/card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<style>
:root{--bg:#f4f3ef;--card:#fff;--fg:#1b1b18;--dim:#6b6a63;--line:#dedcd4;--accent:#f38020;--bad:#c2341b;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--bad:#ff6b52;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--bad:#ff6b52;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,sans-serif}
.w{max-width:640px;margin:0 auto;padding:40px 16px 64px;display:grid;gap:20px}
h1{margin:0;font-size:2rem;letter-spacing:-.02em;line-height:1.15}p{margin:0}.dim{color:var(--dim)}
ol{margin:0;padding:0;list-style:none;display:grid;gap:12px}
li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px;display:grid;gap:10px}
li b{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}
a.btn.alt{background:transparent;color:var(--accent);border:2px solid var(--accent);padding:8px 14px}
a.btn,button{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:6px;padding:10px 16px;font:600 15px system-ui;text-decoration:none;cursor:pointer;justify-self:start}
button:disabled{opacity:.6;cursor:wait}
input{width:100%;padding:10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font:14px ui-monospace,Menlo,monospace}
.looks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media (max-width:520px){.looks{grid-template-columns:repeat(2,1fr)}}
.looks label{position:relative;border:2px solid var(--line);border-radius:8px;cursor:pointer;overflow:hidden;display:grid;font-size:14px;text-align:center}
.looks label span{padding:6px}.looks input{position:absolute;opacity:0}
.looks label:has(input:checked){border-color:var(--accent);color:var(--accent);font-weight:600}
.looks label:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.pv{height:150px;overflow:hidden;position:relative;border-bottom:1px solid var(--line)}
.pv iframe{width:400%;height:400%;border:0;transform:scale(.25);transform-origin:0 0;pointer-events:none;position:absolute;top:0;left:0}
.brand{display:flex;align-items:center;gap:8px;color:var(--fg);text-decoration:none;font:700 18px system-ui;letter-spacing:-.01em}
#err{color:var(--bad)}small{font-size:13px}
</style></head><body><main class="w">
<a href="/" class="brand">${LOGO}<span>CF Cost</span></a>
<h1>What does Cloudflare actually charge you?</h1>
<p class="dim">Plans, usage vs. what's included, invoices, domain renewals, all on one page. Takes about 10 seconds.</p>
<ol>
<li><b>1 · Make a read-only token</b><p>This link opens Cloudflare with the read permissions already ticked. Scroll down, click <em>Continue to summary</em>, then <em>Create Token</em>.</p>
<a class="btn" href="${TOKEN_URL}" target="_blank" rel="noopener">Create token on Cloudflare ↗</a></li>
<li><b>2 · Paste it</b><form id="f" style="display:grid;gap:10px">
<input id="tok" type="password" autocomplete="off" spellcheck="false" placeholder="Paste token" required>
<div class="looks">${['ledger', 'terminal', 'receipt', 'exploded'].map((t, i) => `<label><input type="radio" name="t" value="${t}"${i ? '' : ' checked'}><div class="pv"><iframe src="/try/demo?t=${t}&thumb=1" loading="lazy" tabindex="-1" aria-hidden="true" title=""></iframe></div><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div>
<small class="dim">Pick a look. <a href="/try/demo" target="_blank" style="color:var(--accent)">See a full sample ↗</a></small>
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
const K='cfcost_token',f=document.getElementById('f'),err=document.getElementById('err'),go=document.getElementById('go');
const t0=new URLSearchParams(location.search).get('t');
if(t0){const r=f.querySelector('input[value="'+t0+'"]');if(r)r.checked=true}
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
