// Feedback chat. Visitors get a random id (vid) in localStorage; messages go to D1 (env.CHAT).
// Public:  GET /chat.js (widget), GET/POST /api/chat. Admin (Basic auth): /api/admin/threads|thread|reply.
// If env.CHAT is missing (e.g. a fork deployed without the DB), the widget is never served.

const VID = /^[a-z0-9-]{16,64}$/;
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function chatPublic(req, env, path) {
  if (!env.CHAT) return null;
  if (path === '/chat.js') return new Response(WIDGET, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  if (path !== '/api/chat') return null;
  const u = new URL(req.url);
  if (req.method === 'GET') {
    const vid = u.searchParams.get('vid') || '', after = +u.searchParams.get('after') || 0;
    if (!VID.test(vid)) return json({ error: 'bad vid' }, 400);
    const { results } = await env.CHAT.prepare('SELECT id, sender, body, created_at FROM messages WHERE vid = ? AND id > ? ORDER BY id LIMIT 200').bind(vid, after).all();
    return json({ messages: results });
  }
  if (req.method === 'POST') {
    if (env.TRY_LIMIT && !(await env.TRY_LIMIT.limit({ key: 'chat:' + (req.headers.get('cf-connecting-ip') || 'x') })).success) return json({ error: 'Slow down a little, then send again.' }, 429);
    let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
    const vid = String(b.vid || ''), body = String(b.body || '').trim().slice(0, 2000), page = String(b.page || '').slice(0, 200);
    if (!VID.test(vid) || !body) return json({ error: 'Type a message first.' }, 400);
    const r = await env.CHAT.prepare('INSERT INTO messages (vid, sender, body, page) VALUES (?, ?, ?, ?) RETURNING id, sender, body, created_at').bind(vid, 'user', body, page).first();
    return json({ message: r });
  }
  return json({ error: 'method' }, 405);
}

export async function chatAdmin(req, env, path) {
  if (!path.startsWith('/api/admin/')) return null;
  if (!env.CHAT) return json({ error: 'no CHAT binding' }, 500);
  const u = new URL(req.url);
  if (path === '/api/admin/threads') {
    const { results } = await env.CHAT.prepare(`SELECT m.vid, COUNT(*) n, MAX(m.id) last_id, MAX(m.created_at) last_at,
      (SELECT body FROM messages WHERE vid = m.vid ORDER BY id DESC LIMIT 1) last_body,
      (SELECT sender FROM messages WHERE vid = m.vid ORDER BY id DESC LIMIT 1) last_sender,
      (SELECT page FROM messages WHERE vid = m.vid AND page IS NOT NULL ORDER BY id DESC LIMIT 1) page,
      SUM(m.sender = 'user' AND m.id > COALESCE(t.admin_seen_id, 0)) unread
      FROM messages m LEFT JOIN threads t ON t.vid = m.vid GROUP BY m.vid ORDER BY last_id DESC LIMIT 200`).all();
    return json({ threads: results });
  }
  if (path === '/api/admin/thread') {
    const vid = u.searchParams.get('vid') || '', after = +u.searchParams.get('after') || 0;
    if (!VID.test(vid)) return json({ error: 'bad vid' }, 400);
    const { results } = await env.CHAT.prepare('SELECT id, sender, body, page, created_at FROM messages WHERE vid = ? AND id > ? ORDER BY id').bind(vid, after).all();
    const last = results.at(-1)?.id;
    if (last) await env.CHAT.prepare('INSERT INTO threads (vid, admin_seen_id) VALUES (?, ?) ON CONFLICT(vid) DO UPDATE SET admin_seen_id = MAX(admin_seen_id, excluded.admin_seen_id)').bind(vid, last).run();
    return json({ messages: results });
  }
  if (path === '/api/admin/reply' && req.method === 'POST') {
    const b = await req.json().catch(() => ({}));
    const vid = String(b.vid || ''), body = String(b.body || '').trim().slice(0, 4000);
    if (!VID.test(vid) || !body) return json({ error: 'vid and body required' }, 400);
    const r = await env.CHAT.prepare('INSERT INTO messages (vid, sender, body) VALUES (?, ?, ?) RETURNING id, sender, body, created_at').bind(vid, 'admin', body).first();
    return json({ message: r });
  }
  return json({ error: 'not found' }, 404);
}

// Floating widget. Plain JS, no deps, all text via textContent. Polls 4s while open, 45s closed (only once a thread exists).
const WIDGET = `(()=>{if(window.__cfcChat||window.top!==window)return;window.__cfcChat=1;
const S=(k,v)=>{try{return v===undefined?localStorage.getItem(k):localStorage.setItem(k,v)}catch{}};
let vid=S('cfc_vid');if(!vid){vid=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)).toLowerCase();S('cfc_vid',vid)}
let last=0,open=false,seen=+S('cfc_seen')||0,timer,msgs=[];
const css=\`#cfc-b{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:56px;height:56px;border-radius:50%;border:0;background:#f38020;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;display:grid;place-items:center}
#cfc-b:focus-visible{outline:3px solid #1b1b18;outline-offset:3px}#cfc-b svg{width:26px;height:26px}
#cfc-n{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;border-radius:10px;background:#c2341b;color:#fff;font:600 12px/20px system-ui;padding:0 5px}
#cfc-p{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:min(360px,calc(100vw - 32px));height:min(480px,calc(100vh - 120px));background:#fff;color:#1b1b18;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;font:14px/1.45 system-ui,-apple-system,sans-serif}
#cfc-p header{padding:12px 14px;background:#f38020;color:#fff;font-weight:600}#cfc-p header small{display:block;font-weight:400;opacity:.9}
#cfc-l{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf8f4}
.cfc-m{max-width:80%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
.cfc-u{align-self:flex-end;background:#f38020;color:#fff;border-bottom-right-radius:4px}.cfc-a{align-self:flex-start;background:#ebe7df;border-bottom-left-radius:4px}
.cfc-e{color:#6b6a63;text-align:center;margin:auto 8px}
#cfc-f{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e1d8;background:#fff}
#cfc-t{flex:1;resize:none;border:1px solid #d6d1c5;border-radius:10px;padding:8px 10px;font:inherit;color:inherit;background:#fff;max-height:120px}
#cfc-s{border:0;border-radius:10px;background:#1b1b18;color:#fff;padding:0 14px;font:600 14px system-ui;cursor:pointer}#cfc-s:disabled{opacity:.5}
#cfc-x{color:#c2341b;font-size:12px;padding:0 12px 8px;background:#fff}#cfc-p[hidden],#cfc-n[hidden],#cfc-x[hidden]{display:none}\`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const b=document.createElement('button');b.id='cfc-b';b.type='button';b.setAttribute('aria-label','Send feedback');
b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="cfc-n" hidden></span>';
const p=document.createElement('div');p.id='cfc-p';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-label','Feedback chat');
p.innerHTML='<header>Feedback<small>Bug, idea, question? A human (Brian) reads every one.</small></header><div id="cfc-l" aria-live="polite"></div><div id="cfc-x" hidden></div><form id="cfc-f"><textarea id="cfc-t" rows="1" maxlength="2000" placeholder="Type a message…" aria-label="Message"></textarea><button id="cfc-s" type="submit">Send</button></form>';
document.body.append(p,b);
const L=p.querySelector('#cfc-l'),T=p.querySelector('#cfc-t'),F=p.querySelector('#cfc-f'),X=p.querySelector('#cfc-x'),N=b.querySelector('#cfc-n'),SB=p.querySelector('#cfc-s');
function render(){L.textContent='';if(!msgs.length){const e=document.createElement('div');e.className='cfc-e';e.textContent='Tell us what you think of CF Cost. Replies show up here; leave an email if you want one by mail too.';L.append(e)}
for(const m of msgs){const d=document.createElement('div');d.className='cfc-m '+(m.sender==='user'?'cfc-u':'cfc-a');d.textContent=m.body;d.title=m.created_at;L.append(d)}L.scrollTop=L.scrollHeight;badge()}
function badge(){const n=msgs.filter(m=>m.sender==='admin'&&m.id>seen).length;N.hidden=!n||open;N.textContent=n>9?'9+':n}
async function poll(){try{const r=await fetch('/api/chat?vid='+vid+'&after='+last);if(!r.ok)return;const j=await r.json();if(j.messages.length){for(const m of j.messages)if(!msgs.some(x=>x.id===m.id))msgs.push(m);last=msgs.at(-1).id;S('cfc_has','1');render();if(open)markSeen()}}catch{}}
function markSeen(){const a=msgs.filter(m=>m.sender==='admin').at(-1);if(a){seen=a.id;S('cfc_seen',seen)}badge()}
function sched(){clearInterval(timer);if(open||S('cfc_has'))timer=setInterval(poll,open?4000:45000)}
b.onclick=()=>{open=!open;p.hidden=!open;if(open){render();markSeen();T.focus();poll()}else badge();sched()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)b.click()});
T.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();F.requestSubmit()}});
F.onsubmit=async e=>{e.preventDefault();const body=T.value.trim();if(!body)return;SB.disabled=true;X.hidden=true;
try{const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({vid,body,page:location.pathname+location.search})});const j=await r.json();
if(!r.ok)throw new Error(j.error||'Could not send. Try again.');T.value='';if(!msgs.some(x=>x.id===j.message.id))msgs.push(j.message);last=Math.max(last,j.message.id);S('cfc_has','1');render()}
catch(err){X.textContent=err.message||'Could not send. Check your connection and try again.';X.hidden=false}finally{SB.disabled=false;sched()}};
if(S('cfc_has'))poll();sched();})();`;
