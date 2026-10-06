// cf-cost: Cloudflare spend command & control. Basic auth, live from the billing API, pick a look with ?t=.
import { summarize } from "./lib.js";
import ledger from "./templates/ledger.js";
import terminal from "./templates/terminal.js";
import receipt from "./templates/receipt.js";

const TEMPLATES = { ledger, terminal, receipt };
const API = 'https://api.cloudflare.com/client/v4/accounts/';

// Account comes from CF_ACCOUNT_ID, or the first account the token can see.
let acct;
async function accountId(env) {
  if (env.CF_ACCOUNT_ID) return env.CF_ACCOUNT_ID;
  if (!acct) {
    const j = await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: { Authorization: "Bearer " + env.CF_BILLING_TOKEN } })).json();
    acct = j.result?.[0]?.id;
    if (!acct) throw new Error("token cannot see any account");
  }
  return acct;
}

async function cf(env, path) {
  const r = await fetch(API + await accountId(env) + path, { headers: { Authorization: 'Bearer ' + env.CF_BILLING_TOKEN } });
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
      const t = TEMPLATES[url.searchParams.get("t")] || TEMPLATES[env.TEMPLATE] || ledger;
      return new Response(t(summarize(d)), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    } catch (e) {
      return new Response('Billing API error: ' + e.message, { status: 502 });
    }
  },
};
