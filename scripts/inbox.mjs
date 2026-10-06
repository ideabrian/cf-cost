// Local feedback inbox: `npm run inbox` → http://localhost:4747
// Proxies /api/admin/* to the live worker with Basic auth. Password from env DASH_PASSWORD or .dev.vars (gitignored).
// Binds to 127.0.0.1 only; the password never reaches the browser.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.CFCOST_ORIGIN || 'https://cfcost.com';
const PORT = +process.env.PORT || 4747;
let pass = process.env.DASH_PASSWORD;
if (!pass) try { pass = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/^DASH_PASSWORD\s*=\s*"?([^"\n]+)"?/m)?.[1]; } catch {}
if (!pass) { console.error('Set DASH_PASSWORD (env or .dev.vars).'); process.exit(1); }
const AUTH = 'Basic ' + Buffer.from('admin:' + pass).toString('base64');

createServer(async (req, res) => {
  if (req.url.startsWith('/api/admin/')) {
    const body = req.method === 'POST' ? await new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); }) : undefined;
    try {
      const up = await fetch(ORIGIN + req.url, { method: req.method, body, headers: { authorization: AUTH, 'content-type': 'application/json' } });
      res.writeHead(up.status, { 'content-type': 'application/json' }); res.end(await up.text());
    } catch (e) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Cannot reach ' + ORIGIN + ': ' + e.message })); }
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE);
}).listen(PORT, '127.0.0.1', () => console.log(`CF Cost inbox → http://localhost:${PORT}  (proxying ${ORIGIN})`));

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CF Cost Inbox</title>
<style>
:root{--bg:#f4f3ef;--card:#fff;--fg:#1b1b18;--dim:#6b6a63;--line:#dedcd4;--accent:#f38020;--me:#1b1b18;--them:#ebe7df;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#131311;--card:#1c1c19;--fg:#ecebe6;--dim:#9a988f;--line:#2f2e2a;--accent:#ff9a4a;--me:#ecebe6;--them:#2a2925;color-scheme:dark}}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,sans-serif;display:grid;grid-template-columns:320px 1fr}
aside{border-right:1px solid var(--line);overflow-y:auto;background:var(--card)}
aside h1{font-size:15px;margin:0;padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between}
aside h1 small{color:var(--dim);font-weight:400}
.t{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;font:inherit;padding:12px 16px;cursor:pointer}
.t:hover,.t.on{background:var(--bg)}.t b{display:flex;justify-content:space-between;gap:8px;font-weight:600}.t b span{color:var(--dim);font-weight:400;font-size:12px}
.t p{margin:2px 0 0;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t.unread{box-shadow:inset 4px 0 var(--accent)}.t.unread p{color:var(--fg);font-weight:600}
main{display:flex;flex-direction:column;min-width:0;height:100%}
main header{padding:14px 18px;border-bottom:1px solid var(--line);background:var(--card)}main header small{color:var(--dim);display:block}
#log{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:8px}
.m{max-width:70%;padding:8px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
.m.user{align-self:flex-start;background:var(--them)}.m.admin{align-self:flex-end;background:var(--me);color:var(--bg)}
.m time{display:block;font-size:11px;opacity:.6;margin-top:2px}
form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--card)}
textarea{flex:1;resize:none;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;background:var(--bg);color:var(--fg)}
button.s{border:0;border-radius:10px;background:var(--accent);color:#fff;padding:0 18px;font-weight:600;cursor:pointer}
.empty{margin:auto;color:var(--dim)}#err{color:#c2341b;padding:0 16px}
@media (max-width:700px){body{grid-template-columns:1fr}aside{max-height:40vh}}
</style></head><body>
<aside><h1>Feedback <small id="st">…</small></h1><div id="err"></div><div id="list"></div></aside>
<main><header id="hd"><b>Pick a conversation</b><small>New messages show up within a few seconds.</small></header><div id="log"><div class="empty">No conversation selected.</div></div>
<form id="f" hidden><textarea id="tx" rows="2" placeholder="Reply… (Enter sends, Shift+Enter for a new line)"></textarea><button class="s">Send</button></form></main>
<script>
let cur=null,last=0,threads=[],known=new Map();
const $=id=>document.getElementById(id), ago=t=>{const s=(Date.now()-Date.parse(t))/1e3;return s<60?'now':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':Math.floor(s/86400)+'d'};
async function api(p,o){const r=await fetch(p,o);const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j}
async function loadThreads(){try{const j=await api('/api/admin/threads');$('err').textContent='';$('st').textContent=j.threads.length+' threads';
 for(const t of j.threads){const k=known.get(t.vid);if(k!==undefined&&t.last_id>k&&t.last_sender==='user'&&t.vid!==cur)notify(t)}
 for(const t of j.threads)known.set(t.vid,t.last_id);threads=j.threads;drawList()}catch(e){$('err').textContent=e.message}}
function drawList(){const L=$('list');L.textContent='';const unread=threads.reduce((n,t)=>n+(+t.unread||0),0);document.title=(unread?'('+unread+') ':'')+'CF Cost Inbox';
 if(!threads.length){L.innerHTML='<p style="padding:16px;color:var(--dim)">No feedback yet.</p>';return}
 for(const t of threads){const b=document.createElement('button');b.className='t'+(t.vid===cur?' on':'')+(+t.unread&&t.vid!==cur?' unread':'');
  const h=document.createElement('b');h.textContent=(t.page||'?')+' · '+t.vid.slice(0,6);const s=document.createElement('span');s.textContent=ago(t.last_at)+' · '+t.n;h.append(s);
  const p=document.createElement('p');p.textContent=(t.last_sender==='admin'?'You: ':'')+t.last_body;b.append(h,p);b.onclick=()=>open(t.vid);L.append(b)}}
function notify(t){try{if(Notification.permission==='granted')new Notification('CF Cost feedback',{body:t.last_body})}catch{}}
async function open(vid){cur=vid;last=0;$('log').textContent='';$('f').hidden=false;const t=threads.find(x=>x.vid===vid);
 $('hd').innerHTML='';const b=document.createElement('b');b.textContent='Visitor '+vid.slice(0,8);const s=document.createElement('small');s.textContent='Last on '+(t?.page||'?');$('hd').append(b,s);
 await loadMsgs();loadThreads();$('tx').focus()}
async function loadMsgs(){if(!cur)return;const vid=cur;try{const j=await api('/api/admin/thread?vid='+vid+'&after='+last);if(vid!==cur)return;
 for(const m of j.messages){if(m.id<=last)continue;const d=document.createElement('div');d.className='m '+m.sender;d.textContent=m.body;const tm=document.createElement('time');tm.textContent=new Date(m.created_at).toLocaleString()+(m.page?' · '+m.page:'');d.append(tm);$('log').append(d);last=m.id}
 if(j.messages.length)$('log').scrollTop=$('log').scrollHeight}catch(e){$('err').textContent=e.message}}
$('tx').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('f').requestSubmit()}});
$('f').onsubmit=async e=>{e.preventDefault();const body=$('tx').value.trim();if(!body||!cur)return;try{await api('/api/admin/reply',{method:'POST',body:JSON.stringify({vid:cur,body})});$('tx').value='';await loadMsgs();loadThreads()}catch(e){$('err').textContent='Reply failed: '+e.message}};
document.addEventListener('click',()=>{try{if(Notification.permission==='default')Notification.requestPermission()}catch{}},{once:true});
loadThreads();setInterval(loadThreads,5000);setInterval(loadMsgs,3000);
</script></body></html>`;
