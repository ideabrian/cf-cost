import { CARD_PNG_B64 } from './card.js';
// cf-cost: Cloudflare spend command & control. Basic auth, live from the billing API, pick a look with ?t=.
import { summarize } from "./lib.js";
import ledger from "./templates/ledger.js";
import terminal from "./templates/terminal.js";
import receipt from "./templates/receipt.js";
import exploded from "./templates/exploded.js";
import { chatPublic, chatAdmin } from "./chat.js";
import tryPage from "./try.js";
import { sample } from "./sample.js";
import { brand, FAVICON_SVG } from "./brand.js";

const TEMPLATES = { ledger, terminal, receipt, exploded };
const API = 'https://api.cloudflare.com/client/v4/accounts/';

// Account comes from CF_ACCOUNT_ID, or the first account the token can see.
// Guest (/try) lookups are never cached: the module-level cache is shared across requests.
let acct;
async function accountId(env) {
  if (env.CF_ACCOUNT_ID) return env.CF_ACCOUNT_ID;
  if (env.guest) {
    if (!env.acct) {
      const j = await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: { Authorization: "Bearer " + env.CF_BILLING_TOKEN } })).json();
      env.acct = j.result?.[0]?.id;
      if (!env.acct) throw new Error("That token can't see any account. Check it was copied fully and has Billing Read.");
    }
    return env.acct;
  }
  if (!acct) {
    const j = await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: { Authorization: "Bearer " + env.CF_BILLING_TOKEN } })).json();
    acct = j.result?.[0]?.id;
    if (!acct) throw new Error("token cannot see any account");
  }
  return acct;
}

async function cf(env, path, body) {
  const r = await fetch(API + await accountId(env) + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer " + env.CF_BILLING_TOKEN, ...(body && { "content-type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
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

// Registrar domains + renewal price per TLD. The domain list carries no price, so we price-check a made-up
// name on each TLD (domain-check returns renewal_cost). null = token lacks Registrar Domains Read.
async function domains(env) {
  let list;
  try { list = await cf(env, "/registrar/domains?per_page=100"); } catch { return null; }
  const tlds = [...new Set(list.map(d => d.name.split(".").slice(1).join(".")))];
  const price = {};
  for (let i = 0; i < tlds.length; i += 20) {
    const res = await cf(env, "/registrar/domain-check", { domains: tlds.slice(i, i + 20).map(t => "zq7priceprobe9." + t) }).catch(() => ({}));
    for (const r of res.domains || []) if (r.pricing) price[r.name.split(".").slice(1).join(".")] = Number(r.pricing.renewal_cost);
  }
  return list.map(d => {
    const tld = d.name.split(".").slice(1).join(".");
    return { name: d.name, expires: d.expires_at?.slice(0, 10), autoRenew: !!d.auto_renew, renewal: price[tld] ?? null, days: Math.round((Date.parse(d.expires_at) - Date.now()) / 864e5) };
  }).sort((a, b) => a.days - b.days);
}

// R2 operations per bucket for the billing period, via GraphQL analytics (needs Account Analytics Read).
// Class A/B per developers.cloudflare.com/r2/pricing; deletes and aborts are free. null = no access.
const R2_B = /^(Get|Head)|UsageSummary/;
const R2_FREE = /^(Delete|AbortMultipartUpload)/;
async function r2(env, since) {
  const q = `query($a:String!,$s:Date!,$e:Date!){viewer{accounts(filter:{accountTag:$a}){r2OperationsAdaptiveGroups(limit:1000,filter:{date_geq:$s,date_leq:$e}){sum{requests} dimensions{bucketName actionType}}}}}`;
  try {
    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.CF_BILLING_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ query: q, variables: { a: await accountId(env), s: since, e: new Date().toISOString().slice(0, 10) } }),
    });
    const j = await r.json();
    const rows = j.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups;
    if (!rows) return null;
    const by = {};
    for (const { sum, dimensions: { bucketName: name, actionType: act } } of rows) {
      const b = by[name || '(account)'] || (by[name || '(account)'] = { bucket: name || '(account)', a: 0, b: 0, free: 0, acts: {} });
      b[R2_FREE.test(act) ? 'free' : R2_B.test(act) ? 'b' : 'a'] += sum.requests;
      if (!R2_FREE.test(act)) b.acts[act] = (b.acts[act] || 0) + sum.requests;
    }
    return Object.values(by).map(b => {
      const [topAct, topN] = Object.entries(b.acts).sort((x, y) => y[1] - x[1])[0] || ['deletes only', b.free];
      return { bucket: b.bucket, classA: b.a, classB: b.b, free: b.free, cost: b.a / 1e6 * 4.5 + b.b / 1e6 * 0.36, top: topAct, topN };
    }).sort((x, y) => y.cost - x.cost || y.classA - x.classA);
  } catch { return null; }
}

async function data(env) {
  const [usage, hist, subs, doms] = await Promise.all([
    cf(env, '/billable-usage'),
    cf(env, '/billing/history?per_page=100'),
    cf(env, '/subscriptions').catch(() => []),
    domains(env),
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
  const periodStart = usage[0]?.BillingPeriodStart?.slice(0, 10) || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const buckets = await r2(env, periodStart);
  const invoices = hist.filter(h => h.type === 'invoice').map(h => ({ date: h.occurred_at.slice(0, 10), amount: h.amount ?? null, receipt: h.receipt_id, status: h.status }));
  const plans = subs.filter(s => s.price > 0 || s.rate_plan?.scope !== 'zone').map(s => ({ name: s.rate_plan?.public_name, price: s.price, freq: s.frequency }));
  return { periodStart, meters, buckets, invoices, plans, domains: doms, at: new Date().toISOString() };
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

const html = (b, status = 200) => new Response(b, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

const FORGET = `<p style="text-align:center;font:13px system-ui;opacity:.75;padding:0 16px 32px">Your token lives only in this tab. <a href="/try" onclick="try{sessionStorage.removeItem('cfcost_token')}catch{}" style="color:inherit">Forget it</a></p>`;

// Sample-data render for previews. thumb=1 is the landing-page thumbnail (no banner).
const BANNER = `<div style="position:sticky;top:0;z-index:9;background:#f38020;color:#fff;text-align:center;font:600 14px system-ui;padding:8px 16px">Sample data, not a real account. <a href="/try" style="color:#fff">See yours →</a></div>`;
function demo(url) {
  const t = TEMPLATES[url.searchParams.get('t')] || exploded;
  let h = brand(t(summarize(sample()))).replace(/href="\/api\/data"/g, 'href="/try"').replace(/href="\?t=/g, 'href="/try/demo?t=');
  if (!url.searchParams.has('thumb')) h = h.replace(/<body([^>]*)>/, '<body$1>' + BANNER);
  return html(h);
}

// One render for a visitor's own token. Token arrives in a header, is used for this request only, never logged or stored.
async function guest(req, env) {
  if (env.TRY_LIMIT && !(await env.TRY_LIMIT.limit({ key: req.headers.get('cf-connecting-ip') || 'x' })).success) return new Response('Too many tries. Wait a minute.', { status: 429 });
  const tok = req.headers.get('X-CF-Token') || '';
  if (req.method !== 'POST' || !/^[\w-]{20,200}$/.test(tok)) return new Response("That doesn't look like a Cloudflare API token.", { status: 400 });
  try {
    const t = TEMPLATES[new URL(req.url).searchParams.get('t')] || exploded;
    return html(brand(t(summarize(await data({ CF_BILLING_TOKEN: tok, guest: true })))).replace(/href="\/api\/data"/g, 'href="/try"').replace('</body>', FORGET + '</body>'));
  } catch (e) {
    const m = /9109|10000|Authentication|Unauthorized/.test(e.message) ? "Cloudflare rejected that token. It needs Billing Read; the button above sets that up." : e.message;
    return new Response(m, { status: 502 });
  }
}


// Public "Brian's bill": the owner's real numbers, names hidden, cached 1h so visitors never hit the billing API directly.
const BRIAN_BANNER = `<div style="position:sticky;top:0;z-index:9;background:#111;color:#fff;text-align:center;font:600 14px system-ui;padding:8px 16px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84;margin-right:8px"></span>Brian's real Cloudflare bill, live (refreshed hourly; names hidden). <a href="/" style="color:#3ddc84">See yours →</a></div>`;
function redact(d) {
  const tld = n => (n.match(/\.[a-z.]+$/i) || [''])[0];
  return { ...d,
    invoices: d.invoices.map((i, k) => ({ ...i, receipt: 'INV-' + String(k + 1).padStart(3, '0') })),
    buckets: d.buckets && d.buckets.map((b, k) => ({ ...b, bucket: 'bucket-' + (k + 1) })),
    domains: d.domains && d.domains.map((x, k) => ({ ...x, name: 'domain-' + (k + 1) + tld(x.name) })) };
}
async function brian(req, env, ctx) {
  const url = new URL(req.url), t = TEMPLATES[url.searchParams.get('t')] ? url.searchParams.get('t') : 'exploded';
  const key = new Request('https://cfcost.com/brian?t=' + t + '&v=7'); // bump v to bust cache after template changes
  const hit = await caches.default.match(key); if (hit) return hit;
  let h;
  try { h = brand(TEMPLATES[t](summarize({ ...redact(await data(env)), serverToken: true }))); }
  catch (e) { return new Response('Brian\'s bill is unavailable right now. Try the sample instead: /try/demo', { status: 502 }); }
  h = h.replace(/href="\/api\/data"/g, 'href="/"').replace(/href="\?t=/g, 'href="/brian?t=').replace(/<body([^>]*)>/, '<body$1>' + BRIAN_BANNER).replace('Your bill, exploded', 'Brian\'s bill, exploded');
  const res = new Response(h, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
}

export default {
  async fetch(req, env, ctx) {
    const u0 = new URL(req.url);
    if (u0.hostname === "www.cfcost.com") { u0.hostname = "cfcost.com"; return Response.redirect(u0.toString(), 301); }
    const path = u0.pathname;
    if (path === "/favicon.ico" || path === "/favicon.svg") return new Response(FAVICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
    if (path === "/card.png") return new Response(Uint8Array.from(atob(CARD_PNG_B64), c => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    const pub = await chatPublic(req, env, path); if (pub) return pub;
    if (path === "/" || path === "/try") return html(tryPage());
    if (path === "/try/render") return guest(req, env);
    if (path === "/try/demo") return demo(new URL(req.url));
    if (path === "/brian") return brian(req, env, ctx);
    if (!authed(req, env)) return new Response("Login required", { status: 401, headers: { "WWW-Authenticate": "Basic realm=\"cf-cost\"" } });
    const adm = await chatAdmin(req, env, path); if (adm) return adm;
    const url = new URL(req.url);
    try {
      const d = await data(env);
      if (url.pathname === '/api/data') return Response.json(d);
      if (url.pathname !== '/me') return new Response('Not found', { status: 404 });
      const t = TEMPLATES[url.searchParams.get("t")] || TEMPLATES[env.TEMPLATE] || exploded;
      return new Response(brand(t(summarize(d))), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    } catch (e) {
      return new Response('Billing API error: ' + e.message, { status: 502 });
    }
  },
};
